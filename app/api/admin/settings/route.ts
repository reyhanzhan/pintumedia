import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SECRET_FIELDS } from "@/lib/secret-fields";

const updateSchema = z.object({
  planPrices: z.object({
    series: z.number().int().min(0),
    monthly: z.number().int().min(0),
    weekly: z.number().int().min(0),
  }),
  freeEmails: z.array(z.string().trim().email()).max(10),
  paymentProvider: z.enum(["", "midtrans", "xendit", "linkqu"]),
  secrets: z.record(z.string(), z.string()),
});

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await createAdminClient()
    .from("app_settings")
    .select("plan_prices,free_emails,payment_provider,secrets")
    .eq("id", "default")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    planPrices: data?.plan_prices ?? { series: 25_000, monthly: 39_000, weekly: 19_000 },
    freeEmails: data?.free_emails ?? [],
    paymentProvider: data?.payment_provider ?? "",
    secrets: data?.secrets ?? {},
  });
}

export async function PUT(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = updateSchema.parse(await request.json());
    const filteredSecrets: Record<string, string> = {};
    for (const key of SECRET_FIELDS) {
      const value = input.secrets[key];
      if (typeof value === "string") filteredSecrets[key] = value;
    }
    const { error } = await createAdminClient()
      .from("app_settings")
      .update({
        plan_prices: input.planPrices,
        free_emails: [...new Set(input.freeEmails.map((email) => email.toLowerCase()))],
        payment_provider: input.paymentProvider,
        secrets: filteredSecrets,
        updated_at: new Date().toISOString(),
      })
      .eq("id", "default");
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan pengaturan.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
