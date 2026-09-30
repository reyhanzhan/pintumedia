import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dramaId = url.searchParams.get("dramaId");

  // Access follows the logged-in account too, not only the email typed at checkout,
  // so paying with one email and logging in with another (or on another device) still unlocks.
  const { data: { user } } = await (await createClient()).auth.getUser();
  const emails = [url.searchParams.get("email"), user?.email]
    .filter((value): value is string => !!value)
    .map((value) => value.trim().toLowerCase());
  if (!emails.length && !user) return NextResponse.json({ unlocked: false });

  const settings = await getSettings();
  if (emails.some((email) => settings.freeEmails.includes(email))) {
    return NextResponse.json({ unlocked: true, global: true });
  }

  const nowIso = new Date().toISOString();
  const owner = [...emails.map((email) => `email.ilike.${email}`), ...(user ? [`user_id.eq.${user.id}`] : [])].join(",");
  const { data, error } = await createAdminClient()
    .from("entitlements")
    .select("drama_id,expires_at")
    .or(owner)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);
  if (error) return NextResponse.json({ unlocked: false });

  const rows = data ?? [];
  const globalUnlock = rows.some((row) => !row.drama_id);
  const dramaUnlock = dramaId ? rows.some((row) => row.drama_id === dramaId) : false;
  return NextResponse.json({ unlocked: globalUnlock || dramaUnlock, global: globalUnlock });
}
