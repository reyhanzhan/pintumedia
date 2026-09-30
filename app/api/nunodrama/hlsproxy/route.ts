import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const MAX_REDIRECTS = 5;

/**
 * Streams an HLS manifest (and its segments/keys) through our own https origin,
 * rewriting every URI inside a manifest to route back through this same proxy.
 * Needed because hls.js — and Safari's native player — fetch the manifest and
 * every segment as separate requests; if the upstream CDN only serves http://,
 * each of those requests gets blocked as mixed content on our https:// site
 * (unlike a plain <video src>, browsers do not silently "autoupgrade" XHR/fetch
 * mixed content — they just fail).
 *
 * This is a public "fetch whatever URL you hand me" endpoint, which is an SSRF
 * risk (someone could point `u` at an internal address). isPublicHost() below
 * blocks private/loopback/link-local IPs, and redirects are followed manually
 * so a redirect to an internal address gets the same check instead of being
 * followed blindly by fetch's built-in redirect handling.
 */
function isPrivateIp(ip: string) {
  if (isIP(ip) === 4) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }
  if (isIP(ip) === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::") return true;
    if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
    return false;
  }
  return true;
}

async function assertPublicUrl(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Skema URL tidak diizinkan.");
  const records = await lookup(url.hostname, { all: true });
  if (!records.length || records.some((record) => isPrivateIp(record.address))) {
    throw new Error("Host tidak diizinkan.");
  }
}

async function fetchFollowingSafeRedirects(url: URL, headers: Record<string, string>) {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(current);
    // Timeout covers only the wait for response headers; it must not cut off the body stream.
    const controller = new AbortController();
    const headerTimer = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(current.toString(), { headers, cache: "no-store", redirect: "manual", signal: controller.signal }).finally(() => clearTimeout(headerTimer));
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return response;
      current = new URL(location, current);
      continue;
    }
    return response;
  }
  throw new Error("Terlalu banyak redirect.");
}

function rewriteManifest(text: string, baseUrl: URL, proxyOrigin: string) {
  const proxied = (raw: string) => `${proxyOrigin}/api/nunodrama/hlsproxy?u=${encodeURIComponent(new URL(raw, baseUrl).toString())}`;
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("#")) {
        return line.replace(/URI="([^"]+)"/gi, (_match, uri: string) => `URI="${proxied(uri)}"`);
      }
      return proxied(trimmed);
    })
    .join("\n");
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const target = requestUrl.searchParams.get("u");
  if (!target) return Response.json({ error: "Parameter u wajib diisi." }, { status: 400 });

  let upstreamUrl: URL;
  try {
    upstreamUrl = new URL(target);
    await assertPublicUrl(upstreamUrl);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "URL tidak valid." }, { status: 400 });
  }

  const range = request.headers.get("range");
  const headers: Record<string, string> = { "User-Agent": BROWSER_UA };
  if (range) headers.Range = range;

  let upstream: Response;
  try {
    upstream = await fetchFollowingSafeRedirects(upstreamUrl, headers);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Stream tidak tersedia." }, { status: 502 });
  }
  if (!upstream.ok && upstream.status !== 206) {
    return Response.json({ error: `CDN mengembalikan ${upstream.status}.` }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") || "";
  const isManifest = /\.m3u8(?:\?|$)/i.test(upstreamUrl.pathname) || /mpegurl/i.test(contentType);

  if (isManifest) {
    const text = await upstream.text();
    const rewritten = rewriteManifest(text, upstreamUrl, requestUrl.origin);
    return new Response(rewritten, {
      status: 200,
      headers: { "Content-Type": "application/vnd.apple.mpegurl", "Cache-Control": "private, no-store" },
    });
  }

  const responseHeaders = new Headers({
    "Content-Type": contentType || "video/mp2t",
    "Accept-Ranges": upstream.headers.get("accept-ranges") || "bytes",
    "Cache-Control": "private, no-store",
  });
  for (const name of ["content-length", "content-range"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}
