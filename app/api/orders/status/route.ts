import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  const { data, error } = await createAdminClient().from("orders").select("status").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ status: data.status as "pending" | "paid" | "failed" | "refunded" });
}
