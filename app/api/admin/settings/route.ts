import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SECRET_FIELDS } from "@/lib/secret-fields";
import { DEFAULT_PLANS } from "@/lib/plans";

const planSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1).max(80),
  meta: z.string().trim().max(120),
  amount: z.number().int().min(0),
  scope: z.enum(["drama", "global"]),
  durationDays: z.number().int().min(1).max(3650).nullable(),
});

const updateSchema = z.object({
  plans: z.array(planSchema).max(50),
  freeEmails: z.array(z.string().trim().email()).max(10),
  paymentProvider: z.enum(["", "midtrans", "xendit", "linkqu"]),
  secrets: z.record(z.string(), z.string()),
});

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await createAdminClient()
    .from("app_settings")
    .select("plans,free_emails,payment_provider,secrets")
    .eq("id", "default")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    plans: data?.plans ?? DEFAULT_PLANS,
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
        plans: input.plans,
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
