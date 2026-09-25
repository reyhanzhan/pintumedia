import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";

// Public, read-only: just the prices shoppers need to see before paying.
// Never expose freeEmails/secrets/paymentProvider here.
export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ planPrices: settings.planPrices });
}
