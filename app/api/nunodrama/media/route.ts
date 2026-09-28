import { fetchNunoPlayback } from "@/lib/nunodrama";

const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Some upstream CDNs (e.g. the plain NunoDrama mixed-provider feed) only serve
// over http:// — loading that directly as a <video src> on our https:// site
// hits the browser's mixed-content block and the player just sits there, no
// visible error. Proxying the bytes through our own https:// origin sidesteps
// that entirely (server-to-server fetches aren't subject to mixed-content
// rules). Bstation additionally needs a Bilibili Referer to avoid hotlinking
// blocks, hence the per-provider header below.
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const provider = query.get("provider")?.trim() ?? "";
  const sourceId = query.get("id")?.trim() ?? "";
  const episode = Number(query.get("episode") ?? "");
  if (!provider || !sourceId || !Number.isInteger(episode) || episode < 1 || episode > 9999) {
    return Response.json({ error: "provider, id, dan episode valid wajib diisi." }, { status: 400 });
  }

  try {
    const playback = await fetchNunoPlayback(provider, sourceId, episode);
    const upstreamUrl = provider === "bstation" ? playback.url.replace(/^http:/, "https:") : playback.url;
    const range = request.headers.get("range");
    const headers: Record<string, string> =
      provider === "bstation"
        ? { Referer: "https://www.bilibili.tv/", "User-Agent": BROWSER_UA, Accept: "video/mp4,video/*;q=0.9,*/*;q=0.8" }
        : { "User-Agent": BROWSER_UA, Accept: "video/mp4,video/*;q=0.9,*/*;q=0.8" };
    if (range) headers.Range = range;
    const upstream = await fetch(upstreamUrl, {
      headers,
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(30000),
    });
    if (!upstream.ok && upstream.status !== 206) {
      return Response.json({ error: `CDN provider mengembalikan ${upstream.status}.` }, { status: 502 });
    }
    const responseHeaders = new Headers({
      "Content-Type": upstream.headers.get("content-type") || "video/mp4",
      "Accept-Ranges": upstream.headers.get("accept-ranges") || "bytes",
      "Cache-Control": "private, no-store",
    });
    for (const name of ["content-length", "content-range"]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stream tidak tersedia.";
    return Response.json({ error: message }, { status: 502 });
  }
}
