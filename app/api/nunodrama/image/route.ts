import { createHmac, timingSafeEqual } from "node:crypto";

function validSignature(src: string, signature: string) {
  const token = process.env.NUNODRAMA_API_TOKEN;
  if (!token || !src || !signature) return false;
  const expected = createHmac("sha256", token).update(src).digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(signature, "base64url");
  } catch {
    return false;
  }
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

// Poster hosts we will fetch. Melolo serves HEIC, which Chrome/Edge/Firefox/Android can't
// display (only Safari), so those are converted to JPEG here.
const allowedHost = (host: string) =>
  host === "cdn-oss.miniepisode.media" || host.endsWith(".fizzopic.org") || host.endsWith(".melolostatic.com");

const converted = new Map<string, Promise<Buffer>>();

async function heicToJpeg(cacheKey: string, source: ArrayBuffer) {
  const hit = converted.get(cacheKey);
  if (hit) return hit;
  const job = (async () => {
    const { default: convert } = await import("heic-convert");
    return Buffer.from(await convert({ buffer: Buffer.from(source) as unknown as ArrayBufferLike, format: "JPEG", quality: 0.82 }));
  })();
  converted.set(cacheKey, job);
  job.catch(() => converted.delete(cacheKey));
  if (converted.size > 120) converted.delete(converted.keys().next().value as string);
  return job;
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const src = query.get("src") ?? "";
  const signature = query.get("sig") ?? "";
  if (!validSignature(src, signature)) return Response.json({ error: "Tanda tangan gambar tidak valid." }, { status: 403 });

  try {
    const remoteUrl = new URL(Buffer.from(src, "base64url").toString("utf8"));
    if (remoteUrl.protocol !== "https:" || !allowedHost(remoteUrl.hostname)) {
      return Response.json({ error: "Host gambar tidak diizinkan." }, { status: 400 });
    }
    const upstream = await fetch(remoteUrl, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const contentType = upstream.headers.get("content-type") || "";
    if (!upstream.ok || !contentType.startsWith("image/")) {
      return Response.json({ error: `CDN poster mengembalikan ${upstream.status}.` }, { status: 502 });
    }
    const cacheHeader = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
    if (/hei[cf]/i.test(contentType)) {
      const jpeg = await heicToJpeg(remoteUrl.origin + remoteUrl.pathname, await upstream.arrayBuffer());
      return new Response(new Uint8Array(jpeg), { status: 200, headers: { "Content-Type": "image/jpeg", "Cache-Control": cacheHeader } });
    }
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Poster tidak tersedia.";
    return Response.json({ error: message }, { status: 502 });
  }
}
