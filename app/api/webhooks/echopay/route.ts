import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings, resolveSecret } from "@/lib/settings";

/**
 * EchoPay payment notification. Per echopay.id/dashboard/docs (pasted by the
 * merchant 2026-09-30): "X-EchoPay-Signature dan X-Signature ... HMAC-SHA256
 * dari Payload JSON + Timestamp menggunakan API Secret Anda" — i.e. HMAC over
 * the raw request body text concatenated with the X-Timestamp header value
 * (no separator), keyed by the API Secret. Verified against the RAW body
 * text, not a re-serialized JSON, since key order could differ.
 */
async function verifyEchopaySignature(rawBody: string, timestamp: string | null, signature: string | null) {
  if (!signature || !timestamp) return false;
  const settings = await getSettings();
  const apiSecret = resolveSecret(settings, "ECHOPAY_API_SECRET");
  if (!apiSecret) return false;
  const expected = createHmac("sha256", apiSecret).update(rawBody + timestamp).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const suppliedBuf = Buffer.from(signature, "utf8");
  return expectedBuf.length === suppliedBuf.length && timingSafeEqual(expectedBuf, suppliedBuf);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const timestamp = request.headers.get("x-timestamp");
  const signature = request.headers.get("x-echopay-signature") ?? request.headers.get("x-signature");

  if (!(await verifyEchopaySignature(rawBody, timestamp, signature))) {
    console.error("[echopay webhook] signature rejected", { timestamp, rawBody: rawBody.slice(0, 500) });
    return Response.json({ error: "Signature tidak valid" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  const orderId = String(payload.reference ?? "");
  if (!orderId) return Response.json({ received: true });

  const event = String(payload.event ?? "");
  const paid = event === "payment.success";
  const failed = event === "payment.expired" || event === "payment.failed";

  const { error } = await createAdminClient()
    .from("orders")
    .update({
      status: paid ? "paid" : failed ? "failed" : "pending",
      paid_at: paid ? new Date().toISOString() : null,
      provider_payload: payload,
      failure_reason: failed ? event : null,
    })
    .eq("id", orderId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ received: true });
}
