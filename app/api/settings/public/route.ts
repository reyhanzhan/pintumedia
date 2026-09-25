import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";

// Public, read-only: just what shoppers need to see the plan list before paying.
// Never expose freeEmails/secrets/paymentProvider here.
export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ plans: settings.plans });
}
