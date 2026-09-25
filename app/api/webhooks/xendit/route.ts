import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings, resolveSecret } from "@/lib/settings";

export async function POST(request: Request) {
  const token = request.headers.get("x-callback-token");
  const settings = await getSettings();
  const expectedToken = resolveSecret(settings, "XENDIT_WEBHOOK_TOKEN");
  if (!expectedToken || token !== expectedToken) {
    return Response.json({ error: "Webhook token tidak valid" }, { status: 401 });
  }
  const payload = (await request.json()) as { event?: string; data?: Record<string, unknown>; reference_id?: string; status?: string };
  const data = payload.data ?? {};
  const referenceId = String(data.reference_id ?? payload.reference_id ?? "");
  const rawStatus = String(data.status ?? payload.status ?? "").toUpperCase();
  const paid = /SUCCEEDED|COMPLETED|PAID/.test(`${payload.event ?? ""} ${rawStatus}`.toUpperCase());
  const failed = /FAILED|EXPIRED|CANCELLED/.test(`${payload.event ?? ""} ${rawStatus}`.toUpperCase());
  if (!referenceId) return Response.json({ received: true });
  const { error } = await createAdminClient().from("orders").update({ status: paid ? "paid" : failed ? "failed" : "pending", paid_at: paid ? new Date().toISOString() : null }).eq("id", referenceId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ received: true });
}
