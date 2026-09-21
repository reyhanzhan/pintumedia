import "server-only";

export const plans = {
  series: { label: "Buka serial ini", amount: 25_000 },
  monthly: { label: "Paket bulanan", amount: 39_000 },
  weekly: { label: "Paket 7 hari", amount: 19_000 },
} as const;

export type PlanId = keyof typeof plans;
type CheckoutInput = { orderId: string; planId: PlanId; email: string; origin: string };
export type CheckoutResult = { provider: "midtrans" | "xendit"; reference: string; checkoutUrl: string };

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
  return { provider: "midtrans", reference: data.token, checkoutUrl: data.redirect_url };
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
  return { provider: "xendit", reference: data.payment_session_id, checkoutUrl: data.payment_link_url };
}

export async function createCheckout(input: CheckoutInput) {
  if (process.env.PAYMENT_PROVIDER === "midtrans") return createMidtransCheckout(input);
  if (process.env.PAYMENT_PROVIDER === "xendit") return createXenditCheckout(input);
  throw new Error("Pilih PAYMENT_PROVIDER=midtrans atau PAYMENT_PROVIDER=xendit.");
}
