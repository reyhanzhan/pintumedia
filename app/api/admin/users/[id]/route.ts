import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { error } = await createAdminClient().auth.admin.deleteUser(id);
  // orders.user_id has no ON DELETE CASCADE, so a user with order history can't
  // be deleted until those orders are gone — surface Supabase's real message
  // (a plain object, not an Error instance) instead of a generic failure.
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
