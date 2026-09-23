import { NextResponse } from "next/server";
import { getBstationHandoffUrl } from "@/lib/bstation";

export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get("url")?.trim() ?? "";
  if (!value) {
    return NextResponse.json({ error: "Parameter url wajib diisi." }, { status: 400 });
  }

  try {
    return NextResponse.json({ provider: "bstation", mode: "official-handoff", url: getBstationHandoffUrl(value) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "URL Bstation tidak valid.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
