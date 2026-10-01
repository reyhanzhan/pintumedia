import { NextResponse } from "next/server";
import { fetchNunoDetail } from "@/lib/nunodrama";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const provider = query.get("provider")?.trim() ?? "";
  const sourceId = query.get("id")?.trim() ?? "";
  if (!provider || !sourceId) return NextResponse.json({ error: "provider dan id wajib diisi." }, { status: 400 });
  try {
    const detail = await fetchNunoDetail(provider, sourceId);
    return NextResponse.json(detail, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Detail tidak tersedia." }, { status: 502 });
  }
}
