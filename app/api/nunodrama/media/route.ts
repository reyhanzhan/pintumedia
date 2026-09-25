import { fetchNunoPlayback } from "@/lib/nunodrama";

const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const provider = query.get("provider")?.trim() ?? "";
  const sourceId = query.get("id")?.trim() ?? "";
  const episode = Number(query.get("episode") ?? "");
  if (provider !== "bstation" || !sourceId || !Number.isInteger(episode) || episode < 1 || episode > 9999) {
    return Response.json({ error: "Media proxy hanya tersedia untuk stream Bstation yang tervalidasi." }, { status: 400 });
  }

  try {
    const playback = await fetchNunoPlayback(provider, sourceId, episode);
    const upstreamUrl = playback.url.replace(/^http:/, "https:");
    const range = request.headers.get("range");
    const headers: Record<string, string> = {
      Referer: "https://www.bilibili.tv/",
      "User-Agent": BROWSER_UA,
      Accept: "video/mp4,video/*;q=0.9,*/*;q=0.8",
    };
    if (range) headers.Range = range;
    const upstream = await fetch(upstreamUrl, {
      headers,
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(30000),
    });
    if (!upstream.ok && upstream.status !== 206) {
      return Response.json({ error: `CDN Bstation mengembalikan ${upstream.status}.` }, { status: 502 });
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
    const message = error instanceof Error ? error.message : "Stream Bstation tidak tersedia.";
    return Response.json({ error: message }, { status: 502 });
  }
}
