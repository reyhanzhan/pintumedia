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
    // block (silently — the player just never plays); route those through our own
    // https proxy instead. Skip proxying .m3u8 manifests: hls.js fetches segments
    // directly and the proxy only forwards a single file, not manifest+segments.
    const needsProxy = provider === "bstation" || (/^http:\/\//i.test(playback.url) && !/\.m3u8(?:\?|$)/i.test(playback.url));
    const url = needsProxy
      ? `/api/nunodrama/media?provider=${encodeURIComponent(provider)}&id=${encodeURIComponent(sourceId)}&episode=${episode}`
      : playback.url;
    return NextResponse.json({ ...playback, url }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Playback NunoDrama tidak tersedia.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
