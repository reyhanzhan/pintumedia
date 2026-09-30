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
    // A plain http:// video src on our https:// site hits the browser's mixed-content
    // block (silently for <video src>, outright for hls.js's manifest/segment
    // fetches) — route those through our own https proxy instead. m3u8 manifests
    // need the manifest-rewriting proxy (segments are separate requests); single
    // files (mp4, or Bstation which needs a special Referer) use the plain one.
    const isHls = /\.m3u8(?:\?|$)/i.test(playback.url);
    const isHttp = /^http:\/\//i.test(playback.url);
    let url = playback.url;
    let fallbackUrl: string | undefined;
    const proxyUrl = isHls
      ? `/api/nunodrama/hlsproxy?u=${encodeURIComponent(playback.url)}`
      : `/api/nunodrama/media?provider=${encodeURIComponent(provider)}&id=${encodeURIComponent(sourceId)}&episode=${episode}`;
    if (provider === "bstation") {
      url = proxyUrl; // needs a Bilibili Referer, so it must go through the server
    } else if (isHttp) {
      // Try the CDN directly over https first (faster: no hop through our hosting);
      // the player falls back to the proxy if that fails or doesn't start in time.
      url = playback.url.replace(/^http:/i, "https:");
      fallbackUrl = proxyUrl;
    }
    return NextResponse.json({ ...playback, url, isHls, fallbackUrl }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Playback NunoDrama tidak tersedia.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
