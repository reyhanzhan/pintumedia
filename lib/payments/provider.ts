import "server-only";
import { createHmac } from "node:crypto";
import { resolveSecret, type AppSettings } from "@/lib/settings";

type CheckoutInput = { orderId: string; planId: string; planLabel: string; email: string; origin: string; amount: number };

export type CheckoutResult =
  | { provider: "midtrans" | "xendit"; method: "redirect"; reference: string; checkoutUrl: string }
  | { provider: "linkqu"; method: "virtual_account"; reference: string; bankCode: string; vaNumber: string; expiresAt: string };

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
 * The signature formula and field order below follow LinkQu's public "Panduan
 * Signatur untuk API LinkQu" page for VA creation, but LinkQu does not publish
 * the exact endpoint path or response field names — those come from the private
 * merchant Postman collection/PDF they hand out after registration. Confirm
 * LINKQU_VA_PATH and the `data.*` field names below (set via the admin panel)
 * against that document before relying on this in production.
 */
function linkquSignature(parts: (string | number)[], serverKey: string) {
  const normalized = parts.join(".").toLowerCase().replace(/[^a-z0-9]/g, "");
  return createHmac("sha256", serverKey).update(normalized).digest("hex");
}

async function createLinkQuCheckout(input: CheckoutInput, settings: AppSettings): Promise<CheckoutResult> {
  const baseUrl = resolveSecret(settings, "LINKQU_BASE_URL");
  const path = resolveSecret(settings, "LINKQU_VA_PATH");
  const clientId = resolveSecret(settings, "LINKQU_CLIENT_ID");
  const username = resolveSecret(settings, "LINKQU_USERNAME");
  const pin = resolveSecret(settings, "LINKQU_PIN");
  const serverKey = resolveSecret(settings, "LINKQU_SERVER_KEY");
  const bankCode = resolveSecret(settings, "LINKQU_VA_BANK_CODE");
  if (!baseUrl || !clientId || !username || !pin || !serverKey || !bankCode || !path) {
    throw new Error("Konfigurasi LinkQu belum lengkap (isi di panel admin /admin).");
  }
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const expired = expiresAt.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const customerName = (input.email.split("@")[0] || "PintuMedia").slice(0, 20);
  const signature = linkquSignature(
    [path, "POST", input.amount, expired, bankCode, input.orderId, input.orderId, customerName, input.email, clientId],
    serverKey,
  );
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
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
  if (!response.ok) throw new Error(`LinkQu menolak pembuatan VA (${response.status}).`);
  const data = (await response.json()) as { va_number?: string; virtual_account?: string; account_number?: string };
  const vaNumber = data.va_number ?? data.virtual_account ?? data.account_number;
  if (!vaNumber) throw new Error("LinkQu tidak mengembalikan nomor VA (periksa format respons di dokumentasi merchant).");
  return { provider: "linkqu", method: "virtual_account", reference: input.orderId, bankCode, vaNumber, expiresAt: expiresAt.toISOString() };
}

export async function createCheckout(input: CheckoutInput, settings: AppSettings) {
  if (settings.paymentProvider === "midtrans") return createMidtransCheckout(input, settings);
  if (settings.paymentProvider === "xendit") return createXenditCheckout(input, settings);
  if (settings.paymentProvider === "linkqu") return createLinkQuCheckout(input, settings);
  throw new Error("Pilih metode pembayaran di panel admin (midtrans, xendit, atau linkqu).");
}
