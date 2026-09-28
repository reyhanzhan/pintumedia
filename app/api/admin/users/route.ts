import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Email lives in Supabase Auth (auth.users), not the public profiles table —
// list it via the admin API and merge in display_name from profiles by id.
export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const users: { id: string; email: string; name: string; createdAt: string }[] = [];
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    for (const user of data.users) {
      users.push({ id: user.id, email: user.email ?? "", name: "", createdAt: user.created_at });
    }
    if (data.users.length < perPage) break;
    page += 1;
    if (page > 25) break; // hard cap: 5000 users, avoids an unbounded loop
  }

  const { data: profiles } = await supabase.from("profiles").select("id,display_name");
  const nameById = new Map((profiles ?? []).map((row) => [row.id, row.display_name as string | null]));
  for (const user of users) user.name = nameById.get(user.id) || "";

  users.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({ users });
}
