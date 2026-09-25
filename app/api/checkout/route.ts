import { NextResponse } from "next/server";
import { z } from "zod";
import { createCheckout, plans } from "@/lib/payments/provider";
import { createAdminClient } from "@/lib/supabase/admin";

const inputSchema = z
  .object({
    planId: z.enum(["series", "monthly", "weekly"]),
    email: z.string().email(),
    dramaId: z.string().trim().min(1).max(200).optional(),
    referralCode: z.string().trim().min(3).max(40).optional(),
  })
  .refine((value) => value.planId !== "series" || !!value.dramaId, {
    message: "dramaId wajib diisi untuk paket 'Buka drama ini'.",
    path: ["dramaId"],
  });

export async function POST(request: Request) {
  try {
    const input = inputSchema.parse(await request.json());
    const orderId = crypto.randomUUID();
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const checkout = await createCheckout({ orderId, planId: input.planId, email: input.email, origin });
    const supabase = createAdminClient();
    let referrerProfileId: string | null = null;
    if (input.referralCode) {
      const { data } = await supabase.from("profiles").select("id").eq("referral_code", input.referralCode).maybeSingle();
      referrerProfileId = data?.id ?? null;
    }
    const { error } = await supabase.from("orders").insert({
      id: orderId,
      email: input.email,
      referrer_profile_id: referrerProfileId,
      plan_id: input.planId,
      drama_id: input.planId === "series" ? input.dramaId : null,
      amount: plans[input.planId].amount,
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
