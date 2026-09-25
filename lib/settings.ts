import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { SECRET_FIELDS, type SecretField } from "@/lib/secret-fields";

export type PlanPrices = { series: number; monthly: number; weekly: number };
export type AppSecrets = Partial<Record<SecretField, string>>;
export type PaymentProviderId = "" | "midtrans" | "xendit" | "linkqu";

export type AppSettings = {
  planPrices: PlanPrices;
  freeEmails: string[];
  paymentProvider: PaymentProviderId;
  secrets: AppSecrets;
};

const DEFAULT_PRICES: PlanPrices = { series: 25_000, monthly: 39_000, weekly: 19_000 };

type SettingsRow = { plan_prices: unknown; free_emails: string[]; payment_provider: string; secrets: unknown } | null;

// Supabase may be unconfigured (createAdminClient throws synchronously) or the
// table may not exist yet (query error) — either way, settings should degrade
// to env vars/defaults rather than break every route that reads them.
async function fetchSettingsRow(): Promise<SettingsRow> {
  try {
    const { data } = await createAdminClient()
      .from("app_settings")
      .select("plan_prices,free_emails,payment_provider,secrets")
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

  return {
    planPrices: { ...DEFAULT_PRICES, ...(data?.plan_prices as Partial<PlanPrices> | undefined) },
    freeEmails: data?.free_emails ?? [],
    paymentProvider: (data?.payment_provider as PaymentProviderId) || (process.env.PAYMENT_PROVIDER as PaymentProviderId) || "",
    secrets: (data?.secrets as AppSecrets | undefined) ?? {},
  };
}

export function resolveSecret(settings: AppSettings, key: SecretField): string | undefined {
  return settings.secrets[key] || process.env[key] || undefined;
}

export { SECRET_FIELDS };
