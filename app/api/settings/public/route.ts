import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";

// Public, read-only: just what shoppers need to see the plan list before paying,
// plus which gateway is active (not secret — the checkout page reveals it anyway).
// Never expose freeEmails or secrets here.
export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({
    plans: settings.plans,
    recommendedDramas: settings.recommendedDramas,
    paymentProvider: settings.paymentProvider,
  });
}
