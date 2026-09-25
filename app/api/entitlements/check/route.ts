import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const dramaId = url.searchParams.get("dramaId");
  if (!email) return NextResponse.json({ unlocked: false });

  const nowIso = new Date().toISOString();
  const { data, error } = await createAdminClient()
    .from("entitlements")
    .select("drama_id,expires_at")
    .eq("email", email)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);
  if (error) return NextResponse.json({ unlocked: false });

  const rows = data ?? [];
  const globalUnlock = rows.some((row) => !row.drama_id);
  const dramaUnlock = dramaId ? rows.some((row) => row.drama_id === dramaId) : false;
  return NextResponse.json({ unlocked: globalUnlock || dramaUnlock, global: globalUnlock });
}
