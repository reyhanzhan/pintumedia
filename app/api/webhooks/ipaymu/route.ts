import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings, resolveSecret } from "@/lib/settings";

/**
 * iPaymu payment notification. Verification steps are copied verbatim from
 * docs.ipaymu.com/en/docs/callback (fetched 2026-09-29), not guessed:
 *
 *   1. Convert trx_id, status_code, transaction_status_code, paid_off to
 *      Integer; is_escrow "0"/"1" to Boolean; default additional_info to [].
 *   2. Sort ALL keys ascending A-Z (case-sensitive).
 *   3. JSON.stringify the sorted object, then replace "/" with "\/".
 *   4. HMAC-SHA256 that string using the merchant's iPaymu VA number as key.
 *   5. Compare (hex) against the X-Signature header.
 *
 * iPaymu lets the callback body be form-urlencoded (dashboard default) or
 * JSON (dashboard setting) — we don't control that from here, so both are
 * parsed into a plain string-keyed object before verification.
 */
async function parseBody(request: Request): Promise<Record<string, string>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const json = (await request.json()) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(json).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]));
  }
  const form = await request.formData();
  return Object.fromEntries(Array.from(form.entries()).map(([k, v]) => [k, String(v)]));
}

function normalizeForSignature(fields: Record<string, string>): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...fields };
  for (const key of ["trx_id", "status_code", "transaction_status_code", "paid_off"]) {
    if (key in normalized) normalized[key] = parseInt(String(normalized[key]), 10);
  }
  if ("is_escrow" in normalized) normalized.is_escrow = String(normalized.is_escrow) === "1";
  if (!("additional_info" in normalized)) normalized.additional_info = [];
  else if (typeof normalized.additional_info === "string") {
    try {
      normalized.additional_info = JSON.parse(normalized.additional_info);
    } catch {
      normalized.additional_info = [];
    }
  }
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(normalized).sort()) sorted[key] = normalized[key];
  return sorted;
}

async function verifyIpaymuSignature(fields: Record<string, string>, signature: string | null) {
  if (!signature) return false;
  const settings = await getSettings();
  const va = resolveSecret(settings, "IPAYMU_VA");
  if (!va) return false;
  const sorted = normalizeForSignature(fields);
  const jsonBody = JSON.stringify(sorted).replace(/\//g, "\\/");
  const expected = createHmac("sha256", va).update(jsonBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const suppliedBuf = Buffer.from(signature, "utf8");
  return expectedBuf.length === suppliedBuf.length && timingSafeEqual(expectedBuf, suppliedBuf);
}

export async function POST(request: Request) {
  const fields = await parseBody(request);
  const signature = request.headers.get("x-signature");
  const orderId = fields.reference_id ?? "";

  if (!(await verifyIpaymuSignature(fields, signature))) {
    // Logged (not silently rejected-and-forgotten) so a documentation gap
    // between iPaymu's spec and this implementation surfaces immediately
    // instead of quietly stalling every order the way LinkQu's webhook did.
    console.error("[ipaymu webhook] signature rejected", { orderId, fields });
    return Response.json({ error: "Signature tidak valid" }, { status: 401 });
  }
  if (!orderId) return Response.json({ received: true });

  const statusCode = parseInt(String(fields.status_code ?? ""), 10);
  const paid = statusCode === 1;
  const failed = statusCode === -2 || String(fields.status ?? "").toLowerCase() === "expired";

  const { error } = await createAdminClient()
    .from("orders")
    .update({
      status: paid ? "paid" : failed ? "failed" : "pending",
      paid_at: paid ? new Date().toISOString() : null,
      provider_payload: fields,
      failure_reason: failed ? (fields.system_notes ?? null) : null,
    })
    .eq("id", orderId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ received: true });
}
