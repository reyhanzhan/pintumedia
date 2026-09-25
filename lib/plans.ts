export const plans = {
  series: { label: "Buka drama ini", meta: "Akses selamanya", amount: 25_000 },
  monthly: { label: "Paket bulanan", meta: "Semua drama", amount: 39_000 },
  weekly: { label: "Paket 7 hari", meta: "Semua drama", amount: 19_000 },
} as const;

export type PlanId = keyof typeof plans;

export function formatIDR(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}
