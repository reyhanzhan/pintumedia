import "server-only";
import { createHmac } from "node:crypto";
import { plans, type PlanId } from "@/lib/plans";

export { plans };
export type { PlanId };

type CheckoutInput = { orderId: string; planId: PlanId; email: string; origin: string };

export type CheckoutResult =
  | { provider: "midtrans" | "xendit"; method: "redirect"; reference: string; checkoutUrl: string }
  | { provider: "linkqu"; method: "virtual_account"; reference: string; bankCode: string; vaNumber: string; expiresAt: string };

const basicAuth = (secret: string) => `Basic ${btoa(`${secret}:`)}`;

async function createMidtransCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const key = process.env.MIDTRANS_SERVER_KEY;
  if (!key) throw new Error("MIDTRANS_SERVER_KEY belum diisi.");
  const production = process.env.PAYMENT_ENV === "production";
  const endpoint = production
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: basicAuth(key), Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      transaction_details: { order_id: input.orderId, gross_amount: plans[input.planId].amount },
      customer_details: { email: input.email },
      item_details: [{ id: input.planId, price: plans[input.planId].amount, quantity: 1, name: plans[input.planId].label }],
      callbacks: { finish: `${input.origin}/?payment=finish`, error: `${input.origin}/?payment=error` },
    }),
  });
  if (!response.ok) throw new Error(`Midtrans menolak checkout (${response.status}).`);
  const data = await response.json() as { token: string; redirect_url: string };
  return { provider: "midtrans", method: "redirect", reference: data.token, checkoutUrl: data.redirect_url };
}

async function createXenditCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const key = process.env.XENDIT_SECRET_KEY;
  if (!key) throw new Error("XENDIT_SECRET_KEY belum diisi.");
  const response = await fetch("https://api.xendit.co/sessions", {
    method: "POST",
    headers: { Authorization: basicAuth(key), Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      reference_id: input.orderId,
      session_type: "PAY",
      mode: "PAYMENT_LINK",
      amount: plans[input.planId].amount,
      currency: "IDR",
      country: "ID",
      locale: "id",
      customer: { reference_id: `customer-${input.orderId}`, type: "INDIVIDUAL", email: input.email, individual_detail: { given_names: "PintuMedia" } },
      description: plans[input.planId].label,
      success_return_url: `${input.origin}/?payment=success`,
      cancel_return_url: `${input.origin}/?payment=cancelled`,
    }),
  });
  if (!response.ok) throw new Error(`Xendit menolak checkout (${response.status}).`);
  const data = await response.json() as { payment_session_id: string; payment_link_url: string };
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
 * LINKQU_VA_PATH and the `data.*` field names below against that document before
 * relying on this in production.
 */
function linkquSignature(parts: (string | number)[], serverKey: string) {
  const normalized = parts.join(".").toLowerCase().replace(/[^a-z0-9]/g, "");
  return createHmac("sha256", serverKey).update(normalized).digest("hex");
}

async function createLinkQuCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const baseUrl = process.env.LINKQU_BASE_URL;
  const clientId = process.env.LINKQU_CLIENT_ID;
  const username = process.env.LINKQU_USERNAME;
  const pin = process.env.LINKQU_PIN;
  const serverKey = process.env.LINKQU_SERVER_KEY;
  const bankCode = process.env.LINKQU_VA_BANK_CODE;
  const path = process.env.LINKQU_VA_PATH;
  if (!baseUrl || !clientId || !username || !pin || !serverKey || !bankCode || !path) {
    throw new Error("Konfigurasi LinkQu belum lengkap. Lihat LINKQU_* di .env.example.");
  }
  const amount = plans[input.planId].amount;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const expired = expiresAt.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const customerName = (input.email.split("@")[0] || "PintuMedia").slice(0, 20);
  const signature = linkquSignature(
    [path, "POST", amount, expired, bankCode, input.orderId, input.orderId, customerName, input.email, clientId],
    serverKey,
  );
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      amount,
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
  const data = await response.json() as { va_number?: string; virtual_account?: string; account_number?: string };
  const vaNumber = data.va_number ?? data.virtual_account ?? data.account_number;
  if (!vaNumber) throw new Error("LinkQu tidak mengembalikan nomor VA (periksa format respons di dokumentasi merchant).");
  return { provider: "linkqu", method: "virtual_account", reference: input.orderId, bankCode, vaNumber, expiresAt: expiresAt.toISOString() };
}

export async function createCheckout(input: CheckoutInput) {
  if (process.env.PAYMENT_PROVIDER === "midtrans") return createMidtransCheckout(input);
  if (process.env.PAYMENT_PROVIDER === "xendit") return createXenditCheckout(input);
  if (process.env.PAYMENT_PROVIDER === "linkqu") return createLinkQuCheckout(input);
  throw new Error("Pilih PAYMENT_PROVIDER=midtrans, xendit, atau linkqu.");
}
