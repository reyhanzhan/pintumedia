import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings, resolveSecret } from "@/lib/settings";

/**
 * LinkQu payment notification (VA transfer detected) → mark the order paid, which
 * triggers Supabase's fulfill_paid_order() to grant the entitlement automatically.
 *
 * LinkQu does not publish the callback payload or its signature formula publicly —
 * both come from the private merchant doc/Postman collection they hand out after
 * registration. The field names and signature construction below are best-effort
 * placeholders modeled on their VA-creation signature scheme; confirm them against
 * the real callback sample before going live. Until confirmed, this fails closed
 * (rejects unverifiable calls) rather than silently accepting anything.
 */
async function verifyLinkQuSignature(payload: Record<string, unknown>, signature: string | null) {
  const settings = await getSettings();
  const serverKey = resolveSecret(settings, "LINKQU_SERVER_KEY");
  if (!serverKey || !signature) return false;
  const normalized = [payload.partner_reff, payload.amount, payload.status]
    .join(".")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const expected = createHmac("sha256", serverKey).update(normalized).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const suppliedBuf = Buffer.from(signature, "utf8");
  return expectedBuf.length === suppliedBuf.length && timingSafeEqual(expectedBuf, suppliedBuf);
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Record<string, unknown>;
  const signature = request.headers.get("x-signature") ?? (payload.signature as string | undefined) ?? null;
  if (!(await verifyLinkQuSignature(payload, signature))) {
    return Response.json({ error: "Signature tidak valid" }, { status: 401 });
  }
  const orderId = String(payload.partner_reff ?? "");
  const rawStatus = String(payload.status ?? "").toUpperCase();
  const paid = /SUCCESS|PAID|SETTLE/.test(rawStatus);
  const failed = /FAIL|EXPIRE|CANCEL/.test(rawStatus);
  if (!orderId) return Response.json({ received: true });
  const { error } = await createAdminClient()
    .from("orders")
    .update({ status: paid ? "paid" : failed ? "failed" : "pending", paid_at: paid ? new Date().toISOString() : null })
    .eq("id", orderId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ received: true });
}
