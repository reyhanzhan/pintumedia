import { NextResponse } from "next/server";
import { fetchDramaBosPlayback } from "@/lib/dramabos";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const provider = query.get("provider")?.trim() ?? "";
  const id = query.get("id")?.trim() ?? "";
  const episode = Number(query.get("episode") ?? "");
  if (!provider || !id || !Number.isInteger(episode) || episode < 1 || episode > 9999) {
    return NextResponse.json({ error: "provider, id, dan episode valid wajib diisi." }, { status: 400 });
  }

  try {
    const playback = await fetchDramaBosPlayback(provider, id, episode);
    return NextResponse.json(playback, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Playback DramaBos tidak tersedia.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
