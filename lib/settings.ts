import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { SECRET_FIELDS, type SecretField } from "@/lib/secret-fields";
import { DEFAULT_PLANS, type Plan } from "@/lib/plans";
import type { Drama } from "@/lib/catalog";

export type AppSecrets = Partial<Record<SecretField, string>>;
export type PaymentProviderId = "" | "midtrans" | "xendit" | "linkqu";

export type AppSettings = {
  plans: Plan[];
  freeEmails: string[];
  paymentProvider: PaymentProviderId;
  secrets: AppSecrets;
  recommendedDramas: Drama[];
};

type SettingsRow = { plans: unknown; free_emails: string[]; payment_provider: string; secrets: unknown; recommended_dramas: unknown } | null;

// Supabase may be unconfigured (createAdminClient throws synchronously) or the
// table may not exist yet (query error) — either way, settings should degrade
// to env vars/defaults rather than break every route that reads them.
async function fetchSettingsRow(): Promise<SettingsRow> {
  try {
    const { data } = await createAdminClient()
      .from("app_settings")
      .select("plans,free_emails,payment_provider,secrets,recommended_dramas")
      .eq("id", "default")
      .maybeSingle();
    return data;
  } catch {
    return null;
  }
}

/**
 * Admin-panel settings, stored in Supabase (`app_settings`). Falls back to
 * env vars / defaults whenever the table is empty or unreachable, so the
 * site keeps working exactly as before until an admin overrides something.
 */
export async function getSettings(): Promise<AppSettings> {
  const data = await fetchSettingsRow();
  const plans = data?.plans as Plan[] | undefined;
  const recommendedDramas = data?.recommended_dramas as Drama[] | undefined;

  return {
    plans: Array.isArray(plans) && plans.length ? plans : DEFAULT_PLANS,
    freeEmails: data?.free_emails ?? [],
    paymentProvider: (data?.payment_provider as PaymentProviderId) || (process.env.PAYMENT_PROVIDER as PaymentProviderId) || "",
    secrets: (data?.secrets as AppSecrets | undefined) ?? {},
    recommendedDramas: Array.isArray(recommendedDramas) ? recommendedDramas : [],
  };
}

export function resolveSecret(settings: AppSettings, key: SecretField): string | undefined {
  return settings.secrets[key] || process.env[key] || undefined;
}

export { SECRET_FIELDS };
