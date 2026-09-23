import type { Drama } from "@/lib/catalog";
import { createHmac } from "node:crypto";

type ProviderConfig = {
  apiSlug: string;
  feed: string;
  feedParams?: Record<string, string>;
  idParam?: string;
  episodeParam?: string;
  proxy?: "decrypt" | "proxy";
};

const standard = (apiSlug: string, feed = "foryou", feedParams: Record<string, string> = { page: "1" }): ProviderConfig => ({ apiSlug, feed, feedParams });

export const NUNO_PROVIDERS: Record<string, ProviderConfig> = {
  nunomix: { ...standard("nunomix", "recommend"), proxy: "proxy" },
  dramabox: { ...standard("dramabox"), proxy: "decrypt" },
  dramaverse: standard("dramaverse"),
  dramawave: standard("dramawave"),
  flextv: standard("flextv"),
  flickreels: standard("flickreels"),
  freereels: standard("freereels"),
  goodshort: { ...standard("goodshort", "tren", { page: "1", page_size: "24" }), episodeParam: "episode_index" },
  idrama: standard("idrama"),
  melolo: { ...standard("melolo"), proxy: "decrypt" },
  netshort: standard("netshort"),
  shortmax: { ...standard("shortmax"), proxy: "decrypt" },
  stardust: standard("stardust", "foryou", { page: "1", page_size: "24" }),
  storyreel: { ...standard("storyreel"), proxy: "decrypt" },
  vibeshort: { ...standard("vibeshort"), proxy: "decrypt" },
  bstation: standard("bstation", "foryou", { page: "1", page_size: "24" }),
  bonustv: standard("bonustv"),
  cubetv: standard("cubetv"),
  dotdrama: standard("dotdrama"),
  dramabite: standard("dramabite"),
  drakorid: standard("drakorid"),
  dramarush: standard("dramarush"),
  dynastyshorts: standard("dynasty"),
  freeshort: standard("freeshort", "foryou", { page: "1", limit: "24" }),
  fundrama: standard("fundrama"),
  happyshort: standard("happyshort"),
  huangdou: standard("huangdou"),
  kalostv: standard("kalostv"),
  lookseries: standard("lookseries"),
  lupacine: standard("lupacine"),
  meloshort: standard("meloshort"),
  microdrama: standard("microdrama"),
  minishort: standard("minishort"),
  moboreels: standard("moboreels", "foryou", { page: "1", page_size: "24" }),
  moreshort: standard("moreshort"),
  mydrama: standard("mydrama"),
  mymuse: standard("mymuse"),
  pinedrama: standard("pinedrama"),
  playlet: standard("playlet"),
  radreel: standard("radreels"),
  reelala: standard("relala"),
  reelshort: standard("reelshort"),
  shortswave: standard("shortswave"),
  sixthshort: standard("sixthshort"),
  snackshort: standard("snackshort"),
  sodareels: standard("sodareels"),
  soreel: standard("soreel"),
  starreel: standard("stareel"),
  velolo: standard("velolo"),
  vigloo: standard("vigloo"),
  wetv: standard("wetv"),
  anyreel: standard("anyreel"),
  anime: standard("animex"),
  donghua: standard("donghuaqueen"),
};

type JsonRecord = Record<string, unknown>;

function settings() {
  const token = process.env.NUNODRAMA_API_TOKEN;
  if (!token) throw new Error("NUNODRAMA_API_TOKEN belum diisi.");
  return {
    token,
    baseUrl: (process.env.NUNODRAMA_API_BASE_URL || "https://go.nunodrama.my.id").replace(/\/$/, ""),
  };
}

function proxyPosterUrl(value: string, provider: string) {
  if (!value || provider !== "dramabite") return value;
  const { token } = settings();
  const src = Buffer.from(value, "utf8").toString("base64url");
  const sig = createHmac("sha256", token).update(src).digest("base64url");
  return `/api/nunodrama/image?src=${encodeURIComponent(src)}&sig=${encodeURIComponent(sig)}`;
}

async function requestJson(path: string, params: Record<string, string> = {}) {
  const { token, baseUrl } = settings();
  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "X-API-TOKEN": token, Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(`NunoDrama API returned ${response.status}`);
      return response.json() as Promise<unknown>;
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("NunoDrama API tidak merespons.");
}

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function findItems(payload: unknown, depth = 0): JsonRecord[] {
  if (depth > 4) return [];
  if (Array.isArray(payload)) {
    const objects = payload.map(record).filter((item): item is JsonRecord => !!item);
    if (objects.some((item) => "bookId" in item || "book_id" in item || "bookName" in item || "book_name" in item || "title" in item)) return objects;
    for (const item of payload) {
      const nested = findItems(item, depth + 1);
      if (nested.length) return nested;
    }
    return [];
  }
  const object = record(payload);
  if (!object) return [];
  for (const key of ["books", "data", "records", "items", "list", "results", "dramas"]) {
    if (key in object) {
      const nested = findItems(object[key], depth + 1);
      if (nested.length) return nested;
    }
  }
  for (const value of Object.values(object)) {
    const nested = findItems(value, depth + 1);
    if (nested.length) return nested;
  }
  return [];
}

function firstValue(item: JsonRecord, keys: string[]) {
  return keys.map((key) => item[key]).find((value) => typeof value === "string" || typeof value === "number");
}

function normalizePosterUrl(value: string, provider: string) {
  if (!value) return "";
  if (provider === "dramabite") {
    try {
      const url = new URL(value);
      if (url.hostname === "cdn-oss.miniepisode.media" && !url.pathname.startsWith("/episode/")) {
        url.pathname = `/episode${url.pathname}`;
        return url.toString();
      }
    } catch {
      return value;
    }
  }
  return value;
}

function parseCatalog(payload: unknown, provider: string): Drama[] {
  return findItems(payload).map((item, index) => {
    const sourceId = String(firstValue(item, ["bookId", "book_id", "id", "dramaId", "playletId", "code"]) ?? `${index}`);
    const title = String(firstValue(item, ["bookName", "book_name", "title", "name", "dramaName"]) ?? "").trim();
    const episodes = Number(firstValue(item, ["chapterCount", "chapter_count", "episodeCount", "episode_count", "episodes", "num_videos", "totalEpisode", "totalEpisodes", "total_episodes"]) ?? 0) || 0;
    const poster = normalizePosterUrl(String(firstValue(item, ["cover", "coverUrl", "coverWap", "book_cover", "poster", "thumbnail", "image"]) ?? "").trim(), provider);
    return {
      id: `nuno:${provider}:${sourceId}`,
      title,
      episodes,
      poster: poster ? proxyPosterUrl(poster, provider) : "/brand/pintumedia-logo.jpg",
      synopsis: String(firstValue(item, ["description", "introduction", "intro", "desc", "synopsis"]) ?? ""),
      sourceProvider: provider,
      sourceId,
    } satisfies Drama;
  }).filter((item) => item.title);
}

function findUrl(payload: unknown, depth = 0): string | null {
  if (depth > 5) return null;
  if (typeof payload === "string" && /^https?:\/\//.test(payload)) return payload;
  if (Array.isArray(payload)) {
    for (const value of payload) {
      const found = findUrl(value, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const object = record(payload);
  if (!object) return null;
  for (const key of ["proxyUrl", "videoUrl", "playUrl", "url", "hlsUrl", "streamUrl", "videoPath", "encryptUrl"]) {
    const found = findUrl(object[key], depth + 1);
    if (found) return found;
  }
  for (const value of Object.values(object)) {
    const found = findUrl(value, depth + 1);
    if (found) return found;
  }
  return null;
}

export function supportsNunoProvider(provider: string) {
  return !!NUNO_PROVIDERS[provider];
}

export async function fetchNunoCatalog(provider: string, language: "in" | "en") {
  const config = NUNO_PROVIDERS[provider];
  if (!config) throw new Error(`Provider ${provider} belum didukung adapter NunoDrama.`);

  // Most providers expose a token-scoped language setter. Ignore failures for
  // providers that do not implement it and still request the feed.
  await requestJson(`/api/${config.apiSlug}/set_language`, { lang: language }).catch(() => undefined);
  const payload = await requestJson(`/api/${config.apiSlug}/${config.feed}`, config.feedParams);
  const catalog = parseCatalog(payload, provider);
  if (!catalog.length) throw new Error("NunoDrama API returned an empty catalog");
  return catalog;
}

export async function fetchNunoPlayback(provider: string, sourceId: string, episode: number) {
  const config = NUNO_PROVIDERS[provider];
  if (!config) throw new Error(`Provider ${provider} belum didukung adapter NunoDrama.`);
  const payload = await requestJson(`/api/${config.apiSlug}/stream`, {
    [config.idParam || "book_id"]: sourceId,
    [config.episodeParam || "episode"]: String(episode),
  });
  let url = findUrl(payload);
  if (!url) throw new Error("NunoDrama API tidak mengembalikan URL video.");
  if (config.proxy && /encrypt/i.test(url)) {
    const proxied = await requestJson(`/api/${config.apiSlug}/${config.proxy}`, { url });
    url = findUrl(proxied) || url;
  }
  return { provider, sourceId, episode, url };
}
