import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dramas as fallbackDramas } from "@/lib/catalog";
import { platforms } from "@/lib/platforms";

type SupabaseSeries = {
  id: string;
  title: string;
  synopsis: string | null;
  poster_url: string | null;
  episodes?: { episode_number: number }[];
};

export async function GET(request: Request) {
  const platform = new URL(request.url).searchParams.get("platform") ?? "dramaverse";
  if (!platforms.some((item) => item.slug === platform)) {
    return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
  }
  // The preview remains usable without credentials. Once Supabase is configured,
  // the public RLS-protected catalog becomes the source of truth.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json({ source: "preview", platform, dramas: platform === "dramaverse" || platform === "nunomix" ? fallbackDramas : [] });
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
