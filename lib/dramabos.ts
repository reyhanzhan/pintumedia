import type { Drama } from "@/lib/catalog";

const DEFAULT_BASE_URL = "https://dramabos.live";

// Slugs documented by DramaBos. Our picker may contain more providers than
// the API currently exposes; unsupported slugs remain in preview mode.
const SUPPORTED = new Set([
  "freereels", "fundrama", "microdrama", "vigloo", "dramabox", "dramawave",
  "netshort", "idrama", "shortmax", "goodshort", "melolo", "velolo",
  "reelshort", "flickreels", "dotdrama", "shortswave", "cubetv", "moboreels",
  "happyshort", "pinedrama", "flextv", "reelala", "anyreel", "bonustv",
  "bstation", "kalostv", "vibeshort", "iqiyi", "stardusttv", "reelife",
]);

type ApiItem = Record<string, unknown>;

function config() {
  const apiKey = process.env.DRAMABOS_API_KEY;
  const licensed = process.env.DRAMABOS_CONTENT_LICENSE_CONFIRMED === "true";
  if (!apiKey || !licensed) return null;
  return { apiKey, baseUrl: (process.env.DRAMABOS_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "") };
}

export function isDramaBosProvider(slug: string) {
  return SUPPORTED.has(slug);
}

function asItems(payload: unknown): ApiItem[] {
  if (Array.isArray(payload)) return payload.filter((item): item is ApiItem => !!item && typeof item === "object");
  if (!payload || typeof payload !== "object") return [];
  const root = payload as ApiItem;
  for (const key of ["data", "results", "items", "list", "dramas"]) {
    const value = root[key];
    if (Array.isArray(value)) return value.filter((item): item is ApiItem => !!item && typeof item === "object");
  }
  return [];
}

const stringValue = (item: ApiItem, keys: string[]) => keys.map((key) => item[key]).find((value): value is string | number => typeof value === "string" || typeof value === "number");

export function parseDramaBosCatalog(payload: unknown, provider: string): Drama[] {
  return asItems(payload).map((item, index) => {
    const id = stringValue(item, ["id", "dramaId", "code"]) ?? `${provider}-${index}`;
    const title = String(stringValue(item, ["title", "name"]) ?? "Untitled drama");
    const poster = String(stringValue(item, ["cover", "poster", "thumbnail", "coverUrl"]) ?? "/posters/catalog-01.webp");
    const episodes = Number(stringValue(item, ["episodes", "episodeCount", "totalEpisodes"]) ?? 0) || 0;
    return {
      id: `${provider}:${id}`,
      title,
      episodes,
      poster,
      synopsis: String(stringValue(item, ["desc", "description", "synopsis"]) ?? ""),
      sourceProvider: provider,
      sourceId: String(id),
    } as Drama;
  }).filter((item) => item.title !== "Untitled drama" && item.episodes > 0);
}

export async function fetchDramaBosCatalog(provider: string, language: "in" | "en") {
  const settings = config();
  if (!settings) throw new Error("DramaBos API belum dikonfigurasi atau lisensi konten belum dikonfirmasi.");
  if (!isDramaBosProvider(provider)) throw new Error(`Provider ${provider} belum didukung DramaBos.`);

  const endpoint = `${settings.baseUrl}/${provider}/api/v1/home?lang=${language === "in" ? "id" : "en"}`;
  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${settings.apiKey}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`DramaBos API returned ${response.status}`);
  const catalog = parseDramaBosCatalog(await response.json(), provider);
  if (!catalog.length) throw new Error("DramaBos returned an empty catalog");
  return catalog;
}

export async function fetchDramaBosPlayback(provider: string, id: string, episode: number) {
  const settings = config();
  if (!settings) throw new Error("DramaBos API belum dikonfigurasi atau lisensi konten belum dikonfirmasi.");
  if (!isDramaBosProvider(provider)) throw new Error(`Provider ${provider} belum didukung DramaBos.`);
  const endpoint = `${settings.baseUrl}/${provider}/api/v1/play/${encodeURIComponent(id)}/${episode}`;
  const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${settings.apiKey}`, Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`DramaBos playback returned ${response.status}`);
  const payload = (await response.json()) as ApiItem;
  const hlsUrl = stringValue(payload, ["hlsUrl", "url", "streamUrl"]);
  if (!hlsUrl) throw new Error("DramaBos tidak mengembalikan URL HLS.");
  return { provider, id, episode, hlsUrl: String(hlsUrl) };
}
