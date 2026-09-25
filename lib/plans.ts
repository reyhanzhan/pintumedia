export type PlanScope = "drama" | "global";

export type Plan = {
  id: string;
  label: string;
  meta: string;
  amount: number;
  /** "drama" unlocks only the specific drama being paid for; "global" unlocks everything. */
  scope: PlanScope;
  /** Days until the entitlement expires; null = lifetime (never expires). */
  durationDays: number | null;
};

export const DEFAULT_PLANS: Plan[] = [
  { id: "series", label: "Buka drama ini", meta: "Akses selamanya", amount: 25_000, scope: "drama", durationDays: null },
  { id: "monthly", label: "Paket bulanan", meta: "Semua drama", amount: 39_000, scope: "global", durationDays: 30 },
  { id: "weekly", label: "Paket 7 hari", meta: "Semua drama", amount: 19_000, scope: "global", durationDays: 7 },
];

export function formatIDR(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}
