import { NextResponse } from "next/server";
import { fetchNunoPlayback } from "@/lib/nunodrama";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const provider = query.get("provider")?.trim() ?? "";
  const sourceId = query.get("id")?.trim() ?? "";
  const episode = Number(query.get("episode") ?? "");
  if (!provider || !sourceId || !Number.isInteger(episode) || episode < 1 || episode > 9999) {
    return NextResponse.json({ error: "provider, id, dan episode valid wajib diisi." }, { status: 400 });
  }

  try {
    const playback = await fetchNunoPlayback(provider, sourceId, episode);
    return NextResponse.json(playback, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Playback NunoDrama tidak tersedia.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
