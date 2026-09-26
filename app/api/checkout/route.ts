import { NextResponse } from "next/server";
import { z } from "zod";
import { createCheckout } from "@/lib/payments/provider";
import { getSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  planId: z.string().min(1),
  email: z.string().email(),
  dramaId: z.string().trim().min(1).max(200).optional(),
  referralCode: z.string().trim().min(3).max(40).optional(),
});

export async function POST(request: Request) {
  try {
    const input = inputSchema.parse(await request.json());
    const settings = await getSettings();
    const plan = settings.plans.find((item) => item.id === input.planId);
    if (!plan) return NextResponse.json({ error: "Paket tidak ditemukan." }, { status: 400 });
    if (plan.scope === "drama" && !input.dramaId) {
      return NextResponse.json({ error: "Pilih drama dulu untuk paket ini." }, { status: 400 });
    }

    const orderId = crypto.randomUUID();
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const checkout = await createCheckout(
      { orderId, planId: plan.id, planLabel: plan.label, email: input.email, origin, amount: plan.amount },
      settings,
    );
    const supabase = createAdminClient();
    const sessionClient = await createClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    let referrerProfileId: string | null = null;
    if (input.referralCode) {
      const { data } = await supabase.from("profiles").select("id").eq("referral_code", input.referralCode).maybeSingle();
      referrerProfileId = data?.id ?? null;
    }
    const { error } = await supabase.from("orders").insert({
      id: orderId,
      user_id: user?.id ?? null,
      email: input.email,
      referrer_profile_id: referrerProfileId,
      plan_id: plan.id,
      drama_id: plan.scope === "drama" ? input.dramaId : null,
      duration_days: plan.durationDays,
      amount: plan.amount,
      provider: checkout.provider,
      provider_reference: checkout.reference,
      status: "pending",
    });
    if (error) throw error;
    return NextResponse.json({ orderId, checkout });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout gagal dibuat.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
