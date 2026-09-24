"use client";

import Image from "next/image";
import Hls from "hls.js";
import { platforms } from "../lib/platforms";
import type { Drama } from "../lib/catalog";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Coffee,
  ExternalLink,
  Download,
  ChevronDown,
  ChevronRight,
  Globe2,
  LockKeyhole,
  Menu,
  Play,
  Search,
  ArrowUpDown,
  X,
} from "lucide-react";

const plans = {
  series: { label: "Buka drama ini", meta: "Akses selamanya", price: "Rp25.000" },
  monthly: { label: "Paket bulanan", meta: "Semua drama", price: "Rp39.000" },
  weekly: { label: "Paket 7 hari", meta: "Semua drama", price: "Rp19.000" },
} as const;

type PlanId = keyof typeof plans;

export default function Home() {
  const [language, setLanguage] = useState<"id" | "en">("id");
  const [languageOpen, setLanguageOpen] = useState(false);
  const [coffeeOpen, setCoffeeOpen] = useState(false);
  const t = (id: string, en: string) => language === "id" ? id : en;
  const donationUrl = process.env.NEXT_PUBLIC_DONATION_URL;
  const [platform, setPlatform] = useState("DramaVerse");
  const [platformOpen, setPlatformOpen] = useState(false);
  const [platformQuery, setPlatformQuery] = useState("");
  const [recentPlatforms, setRecentPlatforms] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDrama, setSelectedDrama] = useState<Drama | null>(null);
  const [watching, setWatching] = useState(false);
  const [episode, setEpisode] = useState(1);
  const [episodeMenuOpen, setEpisodeMenuOpen] = useState(false);
  const [episodeQuery, setEpisodeQuery] = useState("");
  const [episodesDescending, setEpisodesDescending] = useState(false);
  const unlocked = false;
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [plan, setPlan] = useState<PlanId>("monthly");
  const [toast, setToast] = useState("");
  const [playbackUrl, setPlaybackUrl] = useState("");
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const [playbackError, setPlaybackError] = useState("");
  const [catalogResult, setCatalogResult] = useState<{ platform: string; language: "id" | "en"; page: number; hasMore: boolean; dramas: Drama[]; error?: boolean; upstreamUnavailable?: boolean; externalOnly?: boolean; integrationUnavailable?: boolean }>({ platform: "", language: "id", page: 0, hasMore: false, dramas: [] });
  const [catalogLoadingMore, setCatalogLoadingMore] = useState(false);
  const catalogLoadingMoreRef = useRef(false);
  const catalogSentinelRef = useRef<HTMLDivElement>(null);
  const catalogLoading = catalogResult.platform !== platform || catalogResult.language !== language;
  const catalog = useMemo(() => catalogResult.platform === platform && catalogResult.language === language ? catalogResult.dramas : [], [catalogResult, platform, language]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!platformOpen && !searchOpen && !paywallOpen && !coffeeOpen && !watching) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [platformOpen, searchOpen, paywallOpen, coffeeOpen, watching]);

  useEffect(() => {
    const controller = new AbortController();
    const slug = platforms.find((item) => item.name === platform)?.slug ?? "dramaverse";
    fetch(`/api/catalog?platform=${encodeURIComponent(slug)}&language=${language}&page=1`, { signal: controller.signal, headers: { Accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error("Catalog unavailable");
        return response.json() as Promise<{ dramas: Drama[]; hasMore?: boolean; upstreamUnavailable?: boolean; externalOnly?: boolean; integrationUnavailable?: boolean }>;
      })
      .then((payload) => {
        if (!controller.signal.aborted) setCatalogResult({ platform, language, page: 1, hasMore: payload.hasMore ?? payload.dramas.length > 0, dramas: payload.dramas, upstreamUnavailable: payload.upstreamUnavailable, externalOnly: payload.externalOnly, integrationUnavailable: payload.integrationUnavailable });
      })
      .catch(() => {
        if (!controller.signal.aborted) setCatalogResult({ platform, language, page: 1, hasMore: false, dramas: [], error: true });
      });
    return () => controller.abort();
  }, [platform, language]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPlatformOpen(false); setSearchOpen(false); setPaywallOpen(false);
        setLanguageOpen(false); setCoffeeOpen(false); setEpisodeMenuOpen(false);
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);

  const loadMoreCatalog = useCallback(async () => {
    if (catalogLoadingMoreRef.current || catalogLoading || !catalogResult.hasMore || catalogResult.platform !== platform || catalogResult.language !== language) return;
    catalogLoadingMoreRef.current = true;
    setCatalogLoadingMore(true);
    const nextPage = catalogResult.page + 1;
    const slug = platforms.find((item) => item.name === platform)?.slug ?? "dramaverse";
    try {
      const response = await fetch(`/api/catalog?platform=${encodeURIComponent(slug)}&language=${language}&page=${nextPage}`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Catalog unavailable");
      const payload = await response.json() as { dramas: Drama[]; hasMore?: boolean };
      setCatalogResult((current) => {
        if (current.platform !== platform || current.language !== language) return current;
        const knownIds = new Set(current.dramas.map((item) => item.id));
        const additions = payload.dramas.filter((item) => {
          if (knownIds.has(item.id)) return false;
          knownIds.add(item.id);
          return true;
        });
        return {
          ...current,
          page: nextPage,
          hasMore: additions.length > 0 && (payload.hasMore ?? true),
          dramas: [...current.dramas, ...additions],
        };
      });
    } catch {
      setCatalogResult((current) => ({ ...current, hasMore: false }));
    } finally {
      catalogLoadingMoreRef.current = false;
      setCatalogLoadingMore(false);
    }
  }, [catalogLoading, catalogResult.hasMore, catalogResult.language, catalogResult.page, catalogResult.platform, language, platform]);

  useEffect(() => {
    const sentinel = catalogSentinelRef.current;
    if (!sentinel || selectedDrama || catalogLoading || !catalogResult.hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void loadMoreCatalog();
    }, { rootMargin: "700px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [catalogLoading, catalogResult.hasMore, loadMoreCatalog, selectedDrama]);

  useEffect(() => {
    if (!watching || !selectedDrama?.sourceProvider || !selectedDrama.sourceId) return;
    if (episode > 5 && !unlocked) return;
    const controller = new AbortController();
    const sourceProvider = selectedDrama.sourceProvider;
    const sourceId = selectedDrama.sourceId;
    const loadPlayback = async () => {
      setPlaybackUrl("");
      setPlaybackError("");
      setPlaybackLoading(true);
      const query = new URLSearchParams({ provider: sourceProvider, id: sourceId, episode: String(episode) });
      try {
        const response = await fetch(`/api/nunodrama/play?${query}`, { signal: controller.signal, headers: { Accept: "application/json" } });
        const payload = await response.json() as { url?: string; error?: string };
        if (!response.ok || !payload.url) throw new Error(payload.error || "Video tidak tersedia");
        if (!controller.signal.aborted) setPlaybackUrl(payload.url);
      } catch (error) {
        if (!controller.signal.aborted) setPlaybackError(error instanceof Error ? error.message : "Video tidak tersedia");
      } finally {
        if (!controller.signal.aborted) setPlaybackLoading(false);
      }
    };
    void loadPlayback();
    return () => controller.abort();
  }, [watching, selectedDrama, episode, unlocked]);

  const activePlatform = platforms.find((item) => item.name === platform) ?? platforms[0];
  const filteredPlatforms = useMemo(
    () => platforms.filter((item) => item.name.toLowerCase().includes(platformQuery.trim().toLowerCase())),
    [platformQuery],
  );
  const searchResults = useMemo(
    () => catalog.filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase())),
    [catalog, searchQuery],
  );
  const visibleEpisodes = useMemo(() => {
    const total = Math.max(selectedDrama?.episodes ?? 0, 1);
    const query = episodeQuery.trim();
    const values = Array.from({ length: total }, (_, index) => index + 1)
      .filter((number) => !query || String(number).includes(query));
    return episodesDescending ? values.reverse() : values;
  }, [episodeQuery, episodesDescending, selectedDrama?.episodes]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const openDrama = (drama: Drama) => {
    setSelectedDrama(drama);
    setWatching(false);
    setEpisodeMenuOpen(false);
    setEpisode(1);
    setSearchOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goHome = () => {
    setSelectedDrama(null);
    setWatching(false);
    setEpisodeMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openPlatformPicker = () => {
    let recent: string[] = [];
    try {
      const saved: unknown = JSON.parse(localStorage.getItem("pintumedia.recent-platforms") ?? "[]");
      if (Array.isArray(saved)) recent = saved.filter((slug): slug is string => typeof slug === "string" && platforms.some((item) => item.slug === slug));
    } catch { /* Platform selection still works when browser storage is unavailable. */ }
    setRecentPlatforms([...new Set([activePlatform.slug, ...recent])].slice(0, 6));
    setPlatformQuery("");
    setPlatformOpen(true);
  };

  const choosePlatform = (slug: string) => {
    const item = platforms.find((entry) => entry.slug === slug);
    if (!item) return;
    const recent = [...new Set([slug, ...recentPlatforms])].slice(0, 6);
    setRecentPlatforms(recent);
    try { localStorage.setItem("pintumedia.recent-platforms", JSON.stringify(recent)); } catch { /* Storage is optional. */ }
    setPlatform(item.name);
    setPlatformOpen(false);
    setSearchQuery("");
    goHome();
  };

  const startWatching = () => {
    setWatching(true);
    setEpisodeMenuOpen(false);
    setEpisodeQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const backToDetail = () => {
    setWatching(false);
    setEpisodeMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const chooseEpisode = (value: number) => {
    if (value > 5 && !unlocked) {
      setPaywallOpen(true);
      setEpisodeMenuOpen(false);
      return;
    }
    setEpisode(value);
    setEpisodeMenuOpen(false);
    notify(`Episode ${value} siap diputar`);
  };

  const header = (
    <header className="site-header">
      <div className="site-header-inner">
        <button className="brand" onClick={goHome} aria-label="PintuMedia beranda">
          <span className="brand-mark"><Image src="/brand/pintumedia-logo.jpg" alt="" width={54} height={54} priority /></span>
          <span>PintuMedia</span>
        </button>
        <div className="header-actions">
          <button className="platform-pill" aria-label={t(`Pilih platform: ${platform}`, `Choose platform: ${platform}`)} aria-haspopup="dialog" aria-expanded={platformOpen} onClick={openPlatformPicker}>
            <Image src={activePlatform.icon} alt="" width={27} height={27} />
            <strong>{platform}</strong>
          </button>
          <div className="language-control">
            <button className="language-pill" aria-label={t("Pilih bahasa", "Choose language")} aria-expanded={languageOpen} onClick={() => setLanguageOpen(!languageOpen)}>
              <Globe2 size={20} /><strong>{language.toUpperCase()}</strong>
              <span className={`language-flag ${language === "id" ? "flag-id" : "flag-us"}`} aria-hidden="true" />
              <ChevronDown className={languageOpen ? "language-chevron open" : "language-chevron"} size={14} />
            </button>
            {languageOpen && <>
              <button className="language-dismiss" aria-label={t("Tutup pilihan bahasa", "Close language menu")} onClick={() => setLanguageOpen(false)} />
              <div className="language-menu" role="menu">
                <div className="language-menu-title">BAHASA / LANGUAGE</div>
                {(["id", "en"] as const).map((code) => <button role="menuitemradio" key={code} aria-checked={language === code} onClick={() => { setLanguage(code); setLanguageOpen(false); }}>
                  <span className="language-option"><span className={`language-option-flag ${code === "id" ? "flag-id" : "flag-us"}`} aria-hidden="true" /><strong>{code === "id" ? "Indonesia" : "English"}</strong></span>{language === code && <Check size={18} />}
                </button>)}
              </div>
            </>}
          </div>
          <button className="search-button" aria-label={t("Cari drama", "Search dramas")} onClick={() => setSearchOpen(true)}>
            <Search size={23} />
          </button>
        </div>
      </div>
    </header>
  );

  return (
    <main>
      {header}

      {!selectedDrama && (
        <div className="catalog-page" aria-busy={catalogLoading}>
          {catalogLoading ? <p className="catalog-empty" role="status">{t("Memuat drama...", "Loading dramas...")}</p> : !catalog.length && <p className="catalog-empty" role="status">{catalogResult.error ? t("Katalog belum dapat dimuat. Silakan coba lagi nanti.", "The catalog could not be loaded. Please try again later.") : t(`Belum ada drama untuk ${platform}.`, `No dramas available for ${platform} yet.`)}</p>}
          {!catalogLoading && catalogResult.upstreamUnavailable && <p className="catalog-notice" role="status">{t(`API ${platform} sedang tidak merespons. Katalog contoh tidak ditampilkan agar tidak menyesatkan. Silakan coba lagi.`, `The ${platform} API is not responding. A sample catalog is not shown because it would be misleading. Please try again.`)}</p>}
          {!catalogLoading && catalogResult.externalOnly && <p className="catalog-notice" role="status">{t("Bstation memakai tautan resmi. Tambahkan hanya video yang Anda punya izin untuk didistribusikan.", "Bstation uses an official handoff. Add only videos you are licensed to distribute.")} <a href="https://www.bilibili.tv/id" target="_blank" rel="noopener noreferrer">{t("Buka Bstation", "Open Bstation")}</a></p>}
          {!catalogLoading && catalogResult.integrationUnavailable && <p className="catalog-notice" role="status">{t(`${platform} ada di picker referensi, tetapi belum tersedia di paket API NunoDrama yang aktif.`, `${platform} appears in the reference picker but is not available in the active NunoDrama API package.`)}</p>}
          {!!catalog.length && <DramaShelf title={t("Terbaru", "Latest")} moreLabel={t("Selengkapnya", "View all")} lessLabel={t("Lebih sedikit", "Show less")} dramas={catalog} onSelect={openDrama} showAll />}
          {!!catalog.length && <div ref={catalogSentinelRef} className="catalog-sentinel" aria-live="polite">{catalogLoadingMore ? <><span className="video-spinner" /> {t("Memuat film berikutnya...", "Loading more titles...")}</> : !catalogResult.hasMore ? t("Semua film dari API sudah ditampilkan.", "All titles from the API are displayed.") : null}</div>}
        </div>
      )}

      {selectedDrama && !watching && (
        <section className="detail-page">
          <button className="back-button" onClick={goHome}><ArrowLeft size={18} /> {t("Kembali", "Back")}</button>
          <div className="detail-layout">
            <div className="detail-poster">
              <Poster drama={selectedDrama} />
              {selectedDrama.spriteX === undefined && <span className="detail-badge">{selectedDrama.episodes > 0 ? `${selectedDrama.episodes} EP` : t("Episode tersedia", "Episodes available")}</span>}
            </div>
            <div className="detail-copy">
              <h1>{selectedDrama.title}</h1>
              <div className="detail-meta"><Play size={15} /> {selectedDrama.episodes > 0 ? `${selectedDrama.episodes} Episode` : t("Jumlah episode belum dilaporkan API", "Episode count not reported by the API")} <b>{platform.toUpperCase()}</b></div>
              <article>
                <h2>{t("Sinopsis", "Synopsis")}</h2>
                <p>{selectedDrama.synopsis || t("Sinopsis belum tersedia.", "Synopsis is not available yet.")}</p>
              </article>
              <button className="watch-now" onClick={startWatching}><Play size={19} fill="currentColor" /> {t("Mulai Menonton", "Start watching")}</button>
            </div>
          </div>
        </section>
      )}

      {selectedDrama && watching && (
        <section className="watch-page">
          <div className="watch-stage">
            <div className="watch-toolbar">
              <button className="watch-back" onClick={backToDetail}><ArrowLeft size={27} /> <span>{t("Kembali", "Back")}</span></button>
              <div className="watch-heading"><strong>{selectedDrama.title}</strong><small>Episode {episode}</small></div>
              <div className="watch-actions">
                <button className="watch-lock" onClick={() => { if (!unlocked) setPaywallOpen(true); }} aria-label={unlocked ? t("Episode terbuka", "Episodes unlocked") : t("Buka episode premium", "Unlock premium episodes")}><LockKeyhole size={26} /></button>
                <button className="episode-menu-button" onClick={() => setEpisodeMenuOpen(true)} aria-label={t("Buka daftar episode", "Open episode list")} aria-expanded={episodeMenuOpen}><Menu size={31} /></button>
              </div>
            </div>
            <div className="video-shell">
              {playbackUrl ? <HlsVideo src={playbackUrl} onError={() => setPlaybackError(t("Video gagal dimuat dari CDN provider. Coba episode lain.", "The video could not be loaded from the provider CDN. Try another episode."))} /> : <>
                <div className="video-poster"><Poster drama={selectedDrama} /></div>
                <div className="video-overlay" />
                <button className="video-play" disabled={playbackLoading} onClick={() => notify(playbackLoading ? t("Menyiapkan video...", "Preparing video...") : t("Video belum tersedia", "Video is not available"))}>{playbackLoading ? <span className="video-spinner" /> : <Play fill="currentColor" />}</button>
                <div className="video-caption"><small>EPISODE {episode}</small><strong>{selectedDrama.title}</strong>{playbackError && <em>{playbackError}</em>}</div>
              </>}
          </div>
          {episodeMenuOpen && <div className="episode-drawer-backdrop" onMouseDown={() => setEpisodeMenuOpen(false)}>
            <aside className="episode-drawer" role="dialog" aria-modal="true" aria-labelledby="episode-drawer-title" onMouseDown={(event) => event.stopPropagation()}>
              <header><div><strong id="episode-drawer-title">{t("Daftar Episode", "Episodes")}</strong><small>{selectedDrama.episodes} {t("Episode Tersedia", "Episodes Available")}</small></div><button onClick={() => setEpisodeMenuOpen(false)} aria-label={t("Tutup", "Close")}><X size={28} /></button></header>
              <div className="episode-tools"><label><Search size={21} /><input value={episodeQuery} onChange={(event) => setEpisodeQuery(event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder={t("Cari episode...", "Find episode...")} /></label><button onClick={() => setEpisodesDescending((value) => !value)} aria-label={t("Balik urutan episode", "Reverse episode order")}><ArrowUpDown size={21} /></button></div>
              <div className="episode-grid">
                {visibleEpisodes.map((number) => {
                  const locked = number > 5 && !unlocked;
                  return <button key={number} className={episode === number ? "active" : ""} onClick={() => chooseEpisode(number)} aria-label={`Episode ${number}${locked ? " Premium" : ""}`}><span>{number}</span>{locked && <LockKeyhole size={13} />}</button>;
                })}
              </div>
            </aside>
          </div>}
          </div>
        </section>
      )}

      <footer className="site-footer"><div className="site-footer-inner"><p>PintuMedia : <a href="https://dedemultimedia.store/" target="_blank" rel="noopener noreferrer">By DedeMultimedia <ExternalLink size={16} aria-hidden="true" /></a></p><span>© 2026</span></div></footer>

      {platformOpen && (
        <div className="modal-backdrop platform-backdrop" onMouseDown={() => setPlatformOpen(false)}>
          <section className="platform-picker" role="dialog" aria-modal="true" aria-label={t("Pilih platform", "Choose platform")} onMouseDown={(event) => event.stopPropagation()}>
            <div className="picker-head">
              <label><Search size={23} /><input aria-label={t("Cari platform", "Search platforms")} value={platformQuery} onChange={(event) => setPlatformQuery(event.target.value)} placeholder={t("Cari platform...", "Search platforms...")} /></label>
              <button onClick={() => setPlatformOpen(false)} aria-label={t("Tutup", "Close")}><X /></button>
            </div>
            {!platformQuery.trim() && recentPlatforms.length > 0 && <div className="picker-recent">
              <p>{t("TERAKHIR DIPAKAI", "RECENTLY USED")}</p>
              <div className="picker-recent-list">
                {recentPlatforms.map((slug) => {
                  const item = platforms.find((entry) => entry.slug === slug)!;
                  return <button key={slug} className={platform === item.name ? "selected" : ""} aria-pressed={platform === item.name} onClick={() => choosePlatform(slug)}>
                    <Image src={item.icon} alt="" width={22} height={22} /><span>{item.name}</span>
                  </button>;
                })}
              </div>
            </div>}
            <div className="picker-grid">
              {filteredPlatforms.map((item) => (
                <button key={item.slug} aria-pressed={platform === item.name} className={platform === item.name ? "selected" : ""} onClick={() => choosePlatform(item.slug)}>
                  <Image src={item.icon} alt={`Logo ${item.name}`} width={58} height={58} />
                  <strong>{item.name}</strong>
                  {platform === item.name && <i><Check size={13} /></i>}
                </button>
              ))}
              {!filteredPlatforms.length && <p className="picker-empty">{t("Platform tidak ditemukan.", "No platforms found.")}</p>}
            </div>
            <footer><span>{platformQuery ? t(`${filteredPlatforms.length} platform ditemukan`, `${filteredPlatforms.length} platforms found`) : t(`${platforms.length} platform tersedia`, `${platforms.length} platforms available`)}</span><strong><Image src={activePlatform.icon} alt="" width={28} height={28} /> {platform}</strong></footer>
          </section>
        </div>
      )}

      {searchOpen && (
        <div className="modal-backdrop search-backdrop" onMouseDown={() => setSearchOpen(false)}>
          <section className="search-panel" role="dialog" aria-modal="true" aria-label={t("Cari drama", "Search dramas")} onMouseDown={(event) => event.stopPropagation()}>
            <div className="search-field"><Search size={22} /><input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t("Cari judul drama...", "Search drama titles...")} /><button onClick={() => setSearchOpen(false)}><X /></button></div>
            <div className="search-results">
              {searchResults.map((drama) => <button key={drama.id} onClick={() => openDrama(drama)}><span className="search-poster"><Poster drama={drama} /></span><span><strong>{drama.title}</strong><small>{drama.episodes} Episode</small></span><ChevronRight /></button>)}
              {!searchResults.length && <p>{t("Drama tidak ditemukan.", "No dramas found.")}</p>}
            </div>
          </section>
        </div>
      )}

      {paywallOpen && (
        <div className="modal-backdrop" onMouseDown={() => setPaywallOpen(false)}>
          <section className="paywall unlock-dialog" role="dialog" aria-modal="true" aria-labelledby="unlock-title" onMouseDown={(event) => event.stopPropagation()}>
            <button autoFocus className="modal-close" aria-label={t("Tutup", "Close")} onClick={() => setPaywallOpen(false)}><X /></button>
            <small className="modal-kicker">{t("EPISODE BERIKUTNYA MENANTI", "YOUR NEXT EPISODE AWAITS")}</small>
            <h2 id="unlock-title">{t("Buka semua episode", "Unlock all episodes")}</h2>
            <p>{t("Episode 1–5 gratis. Pilih akses untuk melanjutkan cerita.", "Episodes 1–5 are free. Choose a plan to continue.")}</p>
            <div className="plan-list">
              {Object.entries(plans).map(([id, item]) => <button className={plan === id ? "selected" : ""} key={id} onClick={() => setPlan(id as PlanId)}><i>{plan === id && <Check size={14} />}</i><span><strong>{t(item.label, id === "series" ? "Unlock this drama" : id === "monthly" ? "Monthly plan" : "7-day plan")}</strong><small>{t(item.meta, id === "series" ? "Lifetime access" : "All dramas")}</small></span><b>{item.price}</b></button>)}
            </div>
            <div className="qris-checkout">
              <div className="qris-summary"><div><small>{t("QRIS · TOKOSWAG", "QRIS · TOKOSWAG")}</small><strong>{selectedDrama?.title}</strong></div><b>{plans[plan].price}</b></div>
              <p className="qris-preview" role="status">{t("Pratinjau pembayaran. Video belum tersedia untuk pembelian; jangan transfer dulu.", "Payment preview. Videos are not available for purchase yet; please do not transfer funds.")}</p>
              <Image className="qris-image" src="/payments/qris-tokoswag.jpg" alt={t("QRIS TOKOSWAG, NMID ID1025369150350", "TOKOSWAG QRIS, NMID ID1025369150350")} width={1135} height={1600} unoptimized />
              <a className="qris-download" href="/payments/qris-tokoswag.jpg" download="PintuMedia-QRIS-TOKOSWAG.jpg"><Download size={17} />{t("Simpan gambar QRIS", "Save QRIS image")}</a>
              <p className="qris-note">{t("QRIS ini atas nama TOKOSWAG. Menyimpan atau memindai QR tidak membuka episode. Akses diberikan setelah pembayaran terverifikasi.", "This QRIS belongs to TOKOSWAG. Saving or scanning the QR does not unlock episodes. Access is granted after payment verification.")}</p>
            </div>
          </section>
        </div>
      )}

      <button className="coffee-button" aria-label={t("Traktir kopi", "Buy us a coffee")} title={t("Traktir kopi", "Buy us a coffee")} onClick={() => setCoffeeOpen(true)}><Coffee size={29} /></button>
      {coffeeOpen && <div className="modal-backdrop" onMouseDown={() => setCoffeeOpen(false)}>
        <section className="paywall coffee-dialog" role="dialog" aria-modal="true" aria-labelledby="coffee-title" onMouseDown={(event) => event.stopPropagation()}>
          <button autoFocus className="modal-close" aria-label={t("Tutup", "Close")} onClick={() => setCoffeeOpen(false)}><X /></button>
          <Coffee size={42} />
          <h2 id="coffee-title">{t("Traktir kopi", "Buy us a coffee")}</h2>
          <p>{t("Terima kasih sudah mendukung PintuMedia.", "Thank you for supporting PintuMedia.")}</p>
          {donationUrl?.startsWith("https://") ? <a className="watch-now wide" href={donationUrl} target="_blank" rel="noopener noreferrer">{t("Traktir sekarang", "Support us")}</a> : <p className="donation-pending">{t("Tautan donasi belum tersedia. Tidak ada pembayaran yang diproses.", "The donation link is not available yet. No payment will be processed.")}</p>}
        </section>
      </div>}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function Poster({ drama }: { drama: Drama }) {
  const [failed, setFailed] = useState(false);
  if (drama.spriteX !== undefined) {
    return <span className="poster-crop" role="img" aria-label={drama.title} style={{
      backgroundImage: `url("${drama.poster}")`,
      backgroundSize: `${1861 / 228 * 100}% ${871 / 342 * 100}%`,
      backgroundPosition: `${drama.spriteX / (1861 - 228) * 100}% ${291 / (871 - 342) * 100}%`,
    }} />;
  }
  if (failed || !drama.poster) {
    return <span className="poster-fallback" role="img" aria-label={drama.title}><b>{drama.title.charAt(0).toUpperCase()}</b><small>PintuMedia</small></span>;
  }
  const bypassOptimizer = /^https?:\/\//i.test(drama.poster) || drama.poster.startsWith("/api/nunodrama/image");
  return <Image src={drama.poster} alt={drama.title} fill sizes="(max-width: 600px) 31vw, (max-width: 1080px) 23vw, 13vw" unoptimized={bypassOptimizer} onError={() => setFailed(true)} />;
}

function HlsVideo({ src, onError }: { src: string; onError: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onErrorRef = useRef(onError);

  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (/\.m3u8(?:\?|$)/i.test(src) && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { void video.play().catch(() => undefined); });
      hls.on(Hls.Events.ERROR, (_event, data) => { if (data.fatal) onErrorRef.current(); });
      return () => hls.destroy();
    }
    video.src = src;
    void video.play().catch(() => undefined);
    return () => { video.removeAttribute("src"); video.load(); };
  }, [src]);

  return <video ref={videoRef} className="nuno-video" controls autoPlay playsInline preload="metadata" onError={() => onErrorRef.current()} />;
}

function DramaShelf({ title, moreLabel, lessLabel, dramas: shelfDramas, onSelect, showAll = false }: { title: string; moreLabel: string; lessLabel: string; dramas: readonly Drama[]; onSelect: (drama: Drama) => void; showAll?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="drama-section">
      <div className="section-head"><h2>{title}</h2>{!showAll && shelfDramas.length > 12 && <button aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? lessLabel : moreLabel} <ChevronRight size={20} /></button>}</div>
      <div className="drama-grid">
        {(showAll || expanded ? shelfDramas : shelfDramas.slice(0, 12)).map((drama) => (
          <button className="drama-card" key={drama.id} onClick={() => onSelect(drama)}>
            <span className="poster-wrap">
              <Poster drama={drama} />
              {drama.spriteX === undefined && <i>{drama.episodes > 0 ? `${drama.episodes} EP` : "EP"}</i>}
              <em><Play size={23} fill="currentColor" /></em>
            </span>
            <strong>{drama.title}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}
