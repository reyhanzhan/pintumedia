import type { Drama } from "@/lib/catalog";

const DEFAULT_DRAMABOX_API = "https://dramabox-api.zone.id";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function firstString(item: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function firstNumber(item: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = Number(item[key]);
    if (Number.isFinite(value) && value >= 0) return value;
  }
  return 0;
}

function findItems(payload: unknown): unknown[] {
  const root = record(payload);
  if (!root) return [];
  const candidates = [root.data, root];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    const value = record(candidate);
    if (!value) continue;

    for (const key of ["book", "books", "records", "list", "items", "dramas"]) {
      if (Array.isArray(value[key])) return value[key] as unknown[];
    }

    const classified = record(value.classifyBookList);
    if (classified && Array.isArray(classified.records)) return classified.records;
  }
  return [];
}

export function parseDramaBoxCatalog(payload: unknown): Drama[] {
  return findItems(payload).flatMap((value, index) => {
    const item = record(value);
    if (!item) return [];

    const id = firstString(item, ["id", "bookId", "book_id"]);
    const title = firstString(item, ["name", "bookName", "title"]);
    const poster = firstString(item, ["cover", "coverWap", "coverUrl", "cover_url", "poster"]);
    if (!id || !title || !poster) return [];

    return [{
      id: `dramabox-${id || index}`,
      title,
      episodes: firstNumber(item, ["chapterCount", "totalEpisodes", "episodeCount", "episodes"]),
      poster,
      synopsis: firstString(item, ["introduction", "description", "synopsis"]),
    } satisfies Drama];
  });
}

export async function fetchDramaBoxCatalog(language: "in" | "en") {
  const baseUrl = (process.env.DRAMABOX_API_BASE_URL || DEFAULT_DRAMABOX_API).replace(/\/$/, "");
  const url = new URL("/api/home", baseUrl);
  url.searchParams.set("page", "1");
  url.searchParams.set("size", "24");
  url.searchParams.set("lang", language);

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`DramaBox API returned ${response.status}`);

  const payload: unknown = await response.json();
  const root = record(payload);
  if (root?.success === false) throw new Error("DramaBox API rejected the request");

  const dramas = parseDramaBoxCatalog(payload);
  if (!dramas.length) throw new Error("DramaBox API returned an empty catalog");
  return dramas;
}
