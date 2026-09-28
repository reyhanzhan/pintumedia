import "server-only";
import { createHmac } from "node:crypto";
import { resolveSecret, type AppSettings } from "@/lib/settings";

type CheckoutInput = { orderId: string; planId: string; planLabel: string; email: string; origin: string; amount: number };

export type CheckoutResult =
  | { provider: "midtrans" | "xendit"; method: "redirect"; reference: string; checkoutUrl: string }
  | { provider: "linkqu"; method: "virtual_account"; reference: string; bankCode: string; vaNumber: string; expiresAt: string }
  | { provider: "linkqu"; method: "qris"; reference: string; qrImageUrl: string; expiresAt: string };

const basicAuth = (secret: string) => `Basic ${btoa(`${secret}:`)}`;

async function createMidtransCheckout(input: CheckoutInput, settings: AppSettings): Promise<CheckoutResult> {
  const key = resolveSecret(settings, "MIDTRANS_SERVER_KEY");
  if (!key) throw new Error("MIDTRANS_SERVER_KEY belum diisi (panel admin atau .env.local).");
  const production = process.env.PAYMENT_ENV === "production";
  const endpoint = production
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: basicAuth(key), Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      transaction_details: { order_id: input.orderId, gross_amount: input.amount },
      customer_details: { email: input.email },
      item_details: [{ id: input.planId, price: input.amount, quantity: 1, name: input.planLabel }],
      callbacks: { finish: `${input.origin}/?payment=finish`, error: `${input.origin}/?payment=error` },
    }),
  });
  if (!response.ok) throw new Error(`Midtrans menolak checkout (${response.status}).`);
  const data = (await response.json()) as { token: string; redirect_url: string };
  return { provider: "midtrans", method: "redirect", reference: data.token, checkoutUrl: data.redirect_url };
}

async function createXenditCheckout(input: CheckoutInput, settings: AppSettings): Promise<CheckoutResult> {
  const key = resolveSecret(settings, "XENDIT_SECRET_KEY");
  if (!key) throw new Error("XENDIT_SECRET_KEY belum diisi (panel admin atau .env.local).");
  const response = await fetch("https://api.xendit.co/sessions", {
    method: "POST",
    headers: { Authorization: basicAuth(key), Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      reference_id: input.orderId,
      session_type: "PAY",
      mode: "PAYMENT_LINK",
      amount: input.amount,
      currency: "IDR",
      country: "ID",
      locale: "id",
      customer: { reference_id: `customer-${input.orderId}`, type: "INDIVIDUAL", email: input.email, individual_detail: { given_names: "PintuMedia" } },
      description: input.planLabel,
      success_return_url: `${input.origin}/?payment=success`,
      cancel_return_url: `${input.origin}/?payment=cancelled`,
    }),
  });
  if (!response.ok) throw new Error(`Xendit menolak checkout (${response.status}).`);
  const data = (await response.json()) as { payment_session_id: string; payment_link_url: string };
  return { provider: "xendit", method: "redirect", reference: data.payment_session_id, checkoutUrl: data.payment_link_url };
}

/**
 * LinkQu virtual-account (VA) checkout: the customer transfers to a bank-specific
 * VA number and LinkQu notifies our webhook automatically — no QR involved.
 *
 * Auth is `client-id`/`client-secret` request headers (LinkQu issues these from
 * the merchant "Credential" dashboard page) plus the signature formula below,
 * copied verbatim from LinkQu's public "Panduan Signatur untuk API LinkQu" page:
 *
 *   $secondvalue = strtolower(preg_replace($regex, "", $amount.$expired.$bank_code
 *     .$partner_reff.$customer_id.$customer_name.$customer_email.$clientID));
 *   $firstvalue = $path.$method;   // NOT normalized — kept as-is, slashes and all
 *   $buildkey = $firstvalue.$secondvalue;
 *   $signature = hash_hmac('sha256', $buildkey, $serverKey);
 *
 * `$path` there is the short form without the "linkqu-partner" prefix (e.g.
 * "/transaction/create/va"), even though the real request URL needs that prefix.
 * `$serverKey` is the dashboard's dedicated Signature Key (LINKQU_SIGNATURE_KEY),
 * not the Client Secret sent in the client-secret header — confirmed against the
 * live API (2026-09-28) after both were tried.
 */
function linkquSignature(path: string, method: string, rest: (string | number)[], serverKey: string) {
  const secondValue = rest.join("").toLowerCase().replace(/[^a-z0-9]/g, "");
  const buildKey = `${path}${method}${secondValue}`;
  return createHmac("sha256", serverKey).update(buildKey).digest("hex");
}

async function createLinkQuCheckout(input: CheckoutInput, settings: AppSettings): Promise<CheckoutResult> {
  const baseUrl = resolveSecret(settings, "LINKQU_BASE_URL");
  const path = resolveSecret(settings, "LINKQU_VA_PATH");
  const clientId = resolveSecret(settings, "LINKQU_CLIENT_ID");
  const username = resolveSecret(settings, "LINKQU_USERNAME");
  const pin = resolveSecret(settings, "LINKQU_PIN");
  const serverKey = resolveSecret(settings, "LINKQU_SERVER_KEY");
  const signatureKey = resolveSecret(settings, "LINKQU_SIGNATURE_KEY");
  const bankCode = resolveSecret(settings, "LINKQU_VA_BANK_CODE");
  if (!baseUrl || !clientId || !username || !pin || !serverKey || !signatureKey || !bankCode || !path) {
    throw new Error("Konfigurasi LinkQu belum lengkap (isi di panel admin /admin).");
  }
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const expired = expiresAt.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const customerName = (input.email.split("@")[0] || "PintuMedia").slice(0, 20);
  const signaturePath = path.replace(/^\/?linkqu-partner/, "");
  const sigParts: (string | number)[] = [input.amount, expired, bankCode, input.orderId, input.orderId, customerName, input.email, clientId];
  // Confirmed against the live API: the HMAC key is the dashboard's dedicated
  // Signature Key, not the Client Secret used in the client-secret header.
  const signature = linkquSignature(signaturePath, "POST", sigParts, signatureKey);
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "client-id": clientId,
      "client-secret": serverKey,
    },
    body: JSON.stringify({
      amount: input.amount,
      partner_reff: input.orderId,
      customer_id: input.orderId,
      customer_name: customerName,
      expired,
      username,
      pin,
      customer_phone: "",
      customer_email: input.email,
      bank_code: bankCode,
      signature,
    }),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`LinkQu menolak pembuatan VA (${response.status}): ${raw.slice(0, 500)}`);
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`LinkQu mengembalikan respons non-JSON: ${raw.slice(0, 500)}`);
  }
  const nested = (data.data as Record<string, unknown> | undefined) ?? data;
  const vaNumber = (nested.va_number ?? nested.virtual_account ?? nested.account_number ?? nested.vaNumber ?? nested.no_va) as string | undefined;
  if (!vaNumber) throw new Error(`LinkQu tidak mengembalikan nomor VA. Respons: ${raw.slice(0, 800)}`);
  return { provider: "linkqu", method: "virtual_account", reference: input.orderId, bankCode, vaNumber, expiresAt: expiresAt.toISOString() };
}

/**
 * LinkQu QRIS checkout: the customer scans a dynamic QR code with any QRIS-
 * compatible e-wallet/bank app; LinkQu notifies our webhook the same way as VA.
 *
 * LinkQu's public signature guide does NOT document a formula for QRIS (the
 * "Create QRIS" row in their Formula Signature table is empty — checked against
 * the raw page source on 2026-09-28). This formula is inferred by dropping the
 * channel-code field (`$bank_code`/`$retail_code`) from the documented VA/retail
 * formulas, since QRIS has no bank/retail channel to select — confirmed working
 * against the live API on the first try (2026-09-28, response_code 00):
 *
 *   $buildkey = $path.$method.strtolower(strip_non_alnum(
 *     $amount.$expired.$partner_reff.$customer_id.$customer_name.$customer_email.$clientID));
 */
async function createLinkQuQrisCheckout(input: CheckoutInput, settings: AppSettings): Promise<CheckoutResult> {
  const baseUrl = resolveSecret(settings, "LINKQU_BASE_URL");
  const vaPath = resolveSecret(settings, "LINKQU_VA_PATH");
  // LinkQu's path table follows one pattern per transaction type: "…/create/<type>".
  // Rather than make the admin fill in yet another path field, derive QRIS's path
  // from the VA path they've already configured (swap the trailing "<type>" segment).
  // LINKQU_QRIS_PATH still overrides this if the derived value is ever wrong.
  const path = resolveSecret(settings, "LINKQU_QRIS_PATH") || vaPath?.replace(/\/create\/[a-z]+$/i, "/create/qris");
  const clientId = resolveSecret(settings, "LINKQU_CLIENT_ID");
  const username = resolveSecret(settings, "LINKQU_USERNAME");
  const pin = resolveSecret(settings, "LINKQU_PIN");
  const serverKey = resolveSecret(settings, "LINKQU_SERVER_KEY");
  const signatureKey = resolveSecret(settings, "LINKQU_SIGNATURE_KEY");
  if (!baseUrl || !clientId || !username || !pin || !serverKey || !signatureKey || !path) {
    throw new Error("Konfigurasi LinkQu QRIS belum lengkap (isi di panel admin /admin).");
  }
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const expired = expiresAt.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const customerName = (input.email.split("@")[0] || "PintuMedia").slice(0, 20);
  const signaturePath = path.replace(/^\/?linkqu-partner/, "");
  const sigParts: (string | number)[] = [input.amount, expired, input.orderId, input.orderId, customerName, input.email, clientId];
  const signature = linkquSignature(signaturePath, "POST", sigParts, signatureKey);
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "client-id": clientId,
      "client-secret": serverKey,
    },
    body: JSON.stringify({
      amount: input.amount,
      partner_reff: input.orderId,
      customer_id: input.orderId,
      customer_name: customerName,
      expired,
      username,
      pin,
      customer_phone: "",
      customer_email: input.email,
      signature,
    }),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`LinkQu menolak pembuatan QRIS (${response.status}): ${raw.slice(0, 800)}`);
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`LinkQu mengembalikan respons non-JSON: ${raw.slice(0, 500)}`);
  }
  const nested = (data.data as Record<string, unknown> | undefined) ?? data;
  // Confirmed against the live API (2026-09-28): LinkQu hosts a ready-made QR
  // image itself — no need to render qris_text into an image ourselves.
  const qrImageUrl = (nested.imageqris ?? nested.qr_image ?? nested.qrImage) as string | undefined;
  if (!qrImageUrl) throw new Error(`LinkQu tidak mengembalikan gambar QRIS. Respons: ${raw.slice(0, 800)}`);
  return { provider: "linkqu", method: "qris", reference: input.orderId, qrImageUrl, expiresAt: expiresAt.toISOString() };
}

export async function createCheckout(input: CheckoutInput, settings: AppSettings) {
  if (settings.paymentProvider === "midtrans") return createMidtransCheckout(input, settings);
  if (settings.paymentProvider === "xendit") return createXenditCheckout(input, settings);
  if (settings.paymentProvider === "linkqu") return createLinkQuCheckout(input, settings);
  if (settings.paymentProvider === "linkqu_qris") return createLinkQuQrisCheckout(input, settings);
  throw new Error("Pilih metode pembayaran di panel admin (midtrans, xendit, LinkQu VA, atau LinkQu QRIS).");
}
