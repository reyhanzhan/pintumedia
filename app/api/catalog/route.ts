import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dramas as fallbackDramas } from "@/lib/catalog";
import { platforms } from "@/lib/platforms";
import { fetchDramaBoxCatalog } from "@/lib/dramabox";
import { fetchDramaBosCatalog, isDramaBosProvider } from "@/lib/dramabos";
import { fetchNunoCatalog, supportsNunoProvider } from "@/lib/nunodrama";

type SupabaseSeries = {
  id: string;
  title: string;
  synopsis: string | null;
  poster_url: string | null;
  episodes?: { episode_number: number }[];
};

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const platform = requestUrl.searchParams.get("platform") ?? "dramaverse";
  const language = requestUrl.searchParams.get("language") === "en" ? "en" : "in";
  if (!platforms.some((item) => item.slug === platform)) {
    return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
  }

  if (supportsNunoProvider(platform) && process.env.NUNODRAMA_API_TOKEN) {
    try {
      const dramas = await fetchNunoCatalog(platform, language);
      return NextResponse.json({ source: "nunodrama-api", platform, dramas }, { headers: { "Cache-Control": "public, s-maxage=180, stale-while-revalidate=300" } });
    } catch {
      return NextResponse.json({ source: "preview-fallback", platform, dramas: fallbackDramas, upstreamUnavailable: true, upstream: "nunodrama" }, { headers: { "Cache-Control": "no-store" } });
    }
  }

  if (isDramaBosProvider(platform) && process.env.DRAMABOS_API_KEY && process.env.DRAMABOS_CONTENT_LICENSE_CONFIRMED === "true") {
    try {
      const dramas = await fetchDramaBosCatalog(platform, language);
      return NextResponse.json({ source: "dramabos-api", platform, dramas }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
    } catch {
      return NextResponse.json({ source: "preview-fallback", platform, dramas: fallbackDramas, upstreamUnavailable: true }, { headers: { "Cache-Control": "no-store" } });
    }
  }

  if (platform === "dramabox") {
    try {
      const dramas = await fetchDramaBoxCatalog(language);
      return NextResponse.json(
        { source: "dramabox-api", platform, dramas },
        { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
      );
    } catch {
      return NextResponse.json({
        source: "preview-fallback",
        platform,
        dramas: fallbackDramas,
        upstreamUnavailable: true,
      }, { headers: { "Cache-Control": "no-store" } });
    }
  }

  // Bstation is intentionally an official handoff until a licensed API or
  // distribution agreement is configured. We do not scrape or proxy CDN data.
  if (platform === "bstation" && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) {
    return NextResponse.json({ source: "official-handoff", platform, dramas: [], externalOnly: true });
  }

  if (isDramaBosProvider(platform) && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) {
    return NextResponse.json({ source: "configuration-required", platform, dramas: [], integrationUnavailable: true });
  }

  // The preview remains usable without credentials. Once Supabase is configured,
  // the public RLS-protected catalog becomes the source of truth.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json({ source: "preview", platform, dramas: platform === "dramaverse" || platform === "nunomix" ? fallbackDramas : [], externalOnly: platform === "bstation" });
  }

  try {
    const supabase = await createClient();
    let query = supabase
      .from("series")
      .select("id,title,synopsis,poster_url,platforms!inner(slug,is_active),episodes(episode_number)")
      .eq("is_published", true)
      .eq("platforms.is_active", true)
      .order("created_at", { ascending: false });
    // NunoMix is the combined catalog; other selectors only see their provider.
    if (platform !== "nunomix") query = query.eq("platforms.slug", platform);
    const { data, error } = await query;
    if (error) throw error;

    const catalog = ((data ?? []) as SupabaseSeries[]).map((item) => ({
      id: item.id,
      title: item.title,
      episodes: item.episodes?.length ?? 0,
      poster: item.poster_url ?? "/posters/catalog-01.webp",
      synopsis: item.synopsis ?? "",
    }));
    return NextResponse.json({ source: "supabase", platform, dramas: catalog }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Catalog unavailable" }, { status: 503 });
  }
}
