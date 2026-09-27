import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";

const inputSchema = z.object({
  email: z.string().trim().email(),
  planId: z.string().min(1),
  dramaId: z.string().trim().min(1).max(200).optional(),
});

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = inputSchema.parse(await request.json());
    const settings = await getSettings();
    const plan = settings.plans.find((item) => item.id === input.planId);
    if (!plan) return NextResponse.json({ error: "Paket tidak ditemukan." }, { status: 400 });
    if (plan.scope === "drama" && !input.dramaId) {
      return NextResponse.json({ error: "ID drama wajib diisi untuk paket ini." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const orderId = crypto.randomUUID();
    const { error: insertError } = await supabase.from("orders").insert({
      id: orderId,
      email: input.email,
      plan_id: plan.id,
      drama_id: plan.scope === "drama" ? input.dramaId : null,
      duration_days: plan.durationDays,
      amount: plan.amount,
      provider: "manual",
      provider_reference: `manual-${orderId}`,
      status: "pending",
    });
    if (insertError) throw insertError;

    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", orderId);
    if (updateError) throw updateError;

    return NextResponse.json({ ok: true, orderId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengaktifkan akses.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
