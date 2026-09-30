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

  const startedAt = Date.now();
  try {
    const playback = await fetchNunoPlayback(provider, sourceId, episode);
    const tookMs = Date.now() - startedAt;
    if (tookMs > 3000) console.warn(`[nunodrama play] slow upstream lookup ${tookMs}ms`, { provider, episode });
    // A plain http:// video src on our https:// site hits the browser's mixed-content
    // block (silently for <video src>, outright for hls.js's manifest/segment
    // fetches) — route those through our own https proxy instead. m3u8 manifests
    // need the manifest-rewriting proxy (segments are separate requests); single
    // files (mp4, or Bstation which needs a special Referer) use the plain one.
    const isHls = /\.m3u8(?:\?|$)/i.test(playback.url);
    const isHttp = /^http:\/\//i.test(playback.url);
    let url = playback.url;
    if (isHls && isHttp) {
      url = `/api/nunodrama/hlsproxy?u=${encodeURIComponent(playback.url)}`;
    } else if (provider === "bstation" || (isHttp && !isHls)) {
      url = `/api/nunodrama/media?provider=${encodeURIComponent(provider)}&id=${encodeURIComponent(sourceId)}&episode=${episode}`;
    }
    return NextResponse.json({ ...playback, url, isHls }, { headers: { "Cache-Control": "private, no-store", "Server-Timing": `lookup;dur=${tookMs}` } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Playback NunoDrama tidak tersedia.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
