import { createAdminClient } from "@/lib/supabase/admin";

const digest = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-512", new TextEncoder().encode(value)))).map((byte) => byte.toString(16).padStart(2, "0")).join("");

export async function POST(request: Request) {
  const payload = await request.json() as Record<string, string>;
  const key = process.env.MIDTRANS_SERVER_KEY;
  if (!key) return Response.json({ error: "Server key belum tersedia" }, { status: 503 });
  const expected = await digest(`${payload.order_id}${payload.status_code}${payload.gross_amount}${key}`);
  if (expected !== payload.signature_key) return Response.json({ error: "Signature tidak valid" }, { status: 401 });
  const paid = ["settlement", "capture"].includes(payload.transaction_status) && payload.fraud_status !== "deny";
  const failed = ["deny", "cancel", "expire", "failure"].includes(payload.transaction_status);
  const status = paid ? "paid" : failed ? "failed" : "pending";
  const { error } = await createAdminClient().from("orders").update({ status, paid_at: paid ? new Date().toISOString() : null }).eq("id", payload.order_id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ received: true });
}
