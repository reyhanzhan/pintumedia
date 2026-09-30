import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * KlikQRIS payment notification. Per klikqris.com developer docs: compare the
 * webhook `signature` with the one returned by /qris/create (stored in
 * orders.provider_payload.signature), ignore already-PAID orders so the
 * product isn't delivered twice, and always answer HTTP 200 on receipt.
 */
const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const orderId = String(payload?.order_id ?? "");
  const signature = String(payload?.signature ?? "");
  if (!payload || !orderId || !signature) return Response.json({ error: "Payload tidak valid" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: order } = await supabase.from("orders").select("status, provider, provider_payload").eq("id", orderId).maybeSingle();
  const stored = (order?.provider_payload as { signature?: string } | null)?.signature;
  if (!order || order.provider !== "klikqris" || !stored || !safeEqual(stored, signature)) {
    console.error("[klikqris webhook] signature rejected", { orderId });
    return Response.json({ error: "Signature tidak valid" }, { status: 401 });
  }
  if (order.status === "paid") return Response.json({ received: true });

  const status = String(payload.status ?? "").toUpperCase();
  const paid = status === "PAID" || status === "SUCCESS";
  const failed = status === "EXPIRED";

  const { error } = await supabase
    .from("orders")
    .update({
      status: paid ? "paid" : failed ? "failed" : "pending",
      paid_at: paid ? new Date().toISOString() : null,
      provider_payload: { ...payload, signature: stored },
      failure_reason: failed ? "expired" : null,
    })
    .eq("id", orderId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ received: true });
}
