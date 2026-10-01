"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Poster } from "@/components/poster";
import type { Drama } from "@/lib/catalog";

// Warms the server-side playback cache so Play is instant after the page opens.
function prefetchPlayback(drama: Drama, episode = 1) {
  if (!drama.sourceProvider || !drama.sourceId) return;
  const query = new URLSearchParams({ provider: drama.sourceProvider, id: drama.sourceId, episode: String(episode) });
  void fetch(`/api/nunodrama/play?${query}`).catch(() => undefined);
}

function dramaHref(drama: Drama) {
  const params = new URLSearchParams({
    rid: String(drama.id),
    rtitle: drama.title,
    rposter: drama.poster,
    reps: String(drama.episodes),
  });
  if (drama.sourceProvider) params.set("rprov", drama.sourceProvider);
  if (drama.sourceId) params.set("rsrc", drama.sourceId);
  return `/?${params.toString()}`;
}

// Full catalog browse, not an admin-curated pick list: the "hot" feed (a mix of
// providers with fast video CDNs — see /api/catalog), paged with infinite scroll so it
// always has content without anyone maintaining a list by hand.
export default function RekomendasiPage() {
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const loadingMoreRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const response = await fetch(`/api/catalog?platform=hot&language=in&page=${nextPage}`);
      const payload = (await response.json()) as { dramas?: Drama[]; hasMore?: boolean };
      const additions = payload.dramas ?? [];
      setDramas((current) => {
        const known = new Set(current.map((item) => String(item.id)));
        return [...current, ...additions.filter((item) => !known.has(String(item.id)))];
      });
      setPage(nextPage);
      setHasMore(additions.length > 0 && (payload.hasMore ?? true));
      setFailed(false);
    } catch {
      if (page === 0) setFailed(true);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, hasMore]);

  useEffect(() => {
    void loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || loading || !hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void loadMore();
    }, { rootMargin: "400px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loading, hasMore, loadMore]);

  return (
    <main className="film-main">
      <header className="site-header">
        <div className="site-header-inner">
          <Link className="brand" href="/" aria-label="PintuMedia beranda">
            <span className="brand-mark"><Image src="/brand/pintumedia-logo.jpg" alt="" width={54} height={54} priority /></span>
            <span>Pintumedia</span>
          </Link>
        </div>
      </header>
      <section className="profile-page">
        <div className="profile-heading">
          <Link className="profile-back" href="/" aria-label="Kembali ke beranda"><ArrowLeft size={24} /></Link>
          <div><span className="profile-kicker">PINTUMEDIA</span><h1>Rekomendasi</h1></div>
        </div>
        {failed && <p style={{ color: "#8e9bb0" }}>Katalog sedang tidak tersedia. Silakan coba lagi nanti.</p>}
        {!failed && loading && <p style={{ color: "#8e9bb0" }}>Memuat...</p>}
        {!failed && !loading && !dramas.length && <p style={{ color: "#8e9bb0" }}>Belum ada drama untuk ditampilkan.</p>}
        <div className="drama-grid recommendation-grid">
          {dramas.map((drama) => {
            const providerLabel = "PintuMedia"; // site brand on every card, whatever provider the film comes from
            return (
              <Link className="drama-card" href={dramaHref(drama)} onPointerEnter={() => prefetchPlayback(drama)} onTouchStart={() => prefetchPlayback(drama)} key={`${drama.sourceProvider ?? ""}-${drama.id}`}>
                <span className="poster-wrap">
                  <Poster drama={drama} />
                  <small className="recommendation-provider">{providerLabel}</small>
                  {drama.spriteX === undefined && <i>{drama.episodes > 0 ? `${drama.episodes} EP` : "EP"}</i>}
                  <em><Play size={23} fill="currentColor" /></em>
                </span>
                <strong>{drama.title}</strong>
              </Link>
            );
          })}
        </div>
        {!!dramas.length && (
          <div ref={sentinelRef} className="catalog-sentinel" aria-live="polite">
            {loadingMore ? <><span className="video-spinner" /> Memuat lebih banyak...</> : !hasMore ? "Semua drama sudah ditampilkan." : null}
          </div>
        )}
      </section>
    </main>
  );
}
