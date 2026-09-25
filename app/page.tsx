"use client";

import Image from "next/image";
import Hls from "hls.js";
import { platforms } from "../lib/platforms";
import type { Drama } from "../lib/catalog";
import { plans, formatIDR, type PlanId } from "../lib/plans";
import type { CheckoutResult } from "../lib/payments/provider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Coffee,
  ExternalLink,
  Copy,
  Loader2,
  ChevronDown,
  ChevronRight,
  Globe2,
  LockKeyhole,
  Menu,
  Play,
  UserRound,
  History,
  ListMusic,
  LogIn,
  Smartphone,
  Share2,
  LifeBuoy,
  ArrowRight,
  Heart,
  UserRoundPlus,
  BadgeDollarSign,
  Search,
  ArrowUpDown,
  Sparkles,
  X,
} from "lucide-react";

type ProfileView = "main" | "history" | "favorites" | "download" | "affiliate" | "help";

export default function Home() {
  const [language, setLanguage] = useState<"id" | "en">("id");
  const [languageOpen, setLanguageOpen] = useState(false);
  const [coffeeOpen, setCoffeeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileView, setProfileView] = useState<ProfileView>("main");
  const [watchHistory, setWatchHistory] = useState<Drama[]>([]);
  const [favoriteDramas, setFavoriteDramas] = useState<Drama[]>([]);
  const [profileNotice, setProfileNotice] = useState("");
  const t = (id: string, en: string) => language === "id" ? id : en;
  const donationUrl = process.env.NEXT_PUBLIC_DONATION_URL;
  const [platform, setPlatform] = useState("DramaVerse");
  const [platformOpen, setPlatformOpen] = useState(false);
  const [platformQuery, setPlatformQuery] = useState("");
  const [recentPlatforms, setRecentPlatforms] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDrama, setSelectedDrama] = useState<Drama | null>(null);
  const profileReturnRef = useRef<{ drama: Drama | null; scrollY: number }>({ drama: null, scrollY: 0 });
  const [watching, setWatching] = useState(false);
  const [episode, setEpisode] = useState(1);
  const [episodeMenuOpen, setEpisodeMenuOpen] = useState(false);
  const [episodeQuery, setEpisodeQuery] = useState("");
  const [episodesDescending, setEpisodesDescending] = useState(false);
  const [globalUnlocked, setGlobalUnlocked] = useState(false);
  const [unlockedDramaIds, setUnlockedDramaIds] = useState<Set<string>>(new Set());
  const unlocked = globalUnlocked || (!!selectedDrama && unlockedDramaIds.has(String(selectedDrama.id)));
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [plan, setPlan] = useState<PlanId>("monthly");
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [checkoutStage, setCheckoutStage] = useState<"select" | "pay">("select");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutInfo, setCheckoutInfo] = useState<{ orderId: string; dramaId: string | null; checkout: CheckoutResult } | null>(null);
  const [planPrices, setPlanPrices] = useState<Record<PlanId, number>>({ series: plans.series.amount, monthly: plans.monthly.amount, weekly: plans.weekly.amount });
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
    const hydrateProfileLists = window.setTimeout(() => {
      try {
        const history = JSON.parse(localStorage.getItem("pintumedia.watch-history") ?? "[]");
        const favorites = JSON.parse(localStorage.getItem("pintumedia.favorites") ?? "[]");
        if (Array.isArray(history)) setWatchHistory(history as Drama[]);
        if (Array.isArray(favorites)) setFavoriteDramas(favorites as Drama[]);
      } catch { /* Profile lists remain usable even if local storage is unavailable. */ }
    }, 0);
    return () => window.clearTimeout(hydrateProfileLists);
  }, []);

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
        setLanguageOpen(false); setCoffeeOpen(false); setEpisodeMenuOpen(false); setProfileOpen(false);
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

  const openPaywall = () => {
    setCheckoutStage("select");
    setCheckoutError("");
    setPaywallOpen(true);
  };

  // Prices can be changed anytime from the admin panel; always show the live value.
  useEffect(() => {
    fetch("/api/settings/public")
      .then((response) => response.json() as Promise<{ planPrices: Record<PlanId, number> }>)
      .then((data) => setPlanPrices(data.planPrices))
      .catch(() => undefined);
  }, []);

  // Returning visitors: if this browser already paid before, restore access
  // without asking them to pay again.
  useEffect(() => {
    const hydrateCheckoutEmail = window.setTimeout(() => {
      const savedEmail = window.localStorage.getItem("pintumedia_email");
      if (!savedEmail) return;
      setCheckoutEmail(savedEmail);
      fetch(`/api/entitlements/check?email=${encodeURIComponent(savedEmail)}`)
        .then((response) => response.json() as Promise<{ unlocked: boolean; global?: boolean }>)
        .then((data) => { if (data.global) setGlobalUnlocked(true); })
        .catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(hydrateCheckoutEmail);
  }, []);

  // When opening a drama, check whether this email already unlocked this one specifically.
  useEffect(() => {
    if (!selectedDrama || globalUnlocked || !checkoutEmail) return;
    const dramaId = String(selectedDrama.id);
    if (unlockedDramaIds.has(dramaId)) return;
    fetch(`/api/entitlements/check?email=${encodeURIComponent(checkoutEmail)}&dramaId=${encodeURIComponent(dramaId)}`)
      .then((response) => response.json() as Promise<{ unlocked: boolean }>)
      .then((data) => {
        if (data.unlocked) setUnlockedDramaIds((current) => new Set(current).add(dramaId));
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDrama, checkoutEmail, globalUnlocked]);

  const handleCheckout = async () => {
    const email = checkoutEmail.trim();
    if (!email) { setCheckoutError(t("Email wajib diisi.", "Email is required.")); return; }
    const dramaId = plan === "series" && selectedDrama ? String(selectedDrama.id) : null;
    if (plan === "series" && !dramaId) { setCheckoutError(t("Pilih drama dulu.", "Pick a drama first.")); return; }
    setCheckoutLoading(true);
    setCheckoutError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan, email, dramaId: dramaId ?? undefined }),
      });
      const data = (await response.json()) as { orderId?: string; checkout?: CheckoutResult; error?: string };
      if (!response.ok || !data.orderId || !data.checkout) {
        throw new Error(data.error || t("Checkout gagal dibuat.", "Checkout could not be created."));
      }
      window.localStorage.setItem("pintumedia_email", email);
      setCheckoutInfo({ orderId: data.orderId, dramaId, checkout: data.checkout });
      setCheckoutStage("pay");
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : t("Checkout gagal dibuat.", "Checkout could not be created."));
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Poll for the LinkQu/Midtrans/Xendit webhook to flip the order to "paid", then
  // unlock automatically — no manual confirmation needed.
  useEffect(() => {
    if (checkoutStage !== "pay" || !checkoutInfo) return;
    const interval = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/orders/status?id=${encodeURIComponent(checkoutInfo.orderId)}`);
        const data = (await response.json()) as { status?: string };
        if (data.status === "paid") {
          window.clearInterval(interval);
          if (checkoutInfo.dramaId) setUnlockedDramaIds((current) => new Set(current).add(checkoutInfo.dramaId!));
          else setGlobalUnlocked(true);
          setPaywallOpen(false);
          setCheckoutStage("select");
          setCheckoutInfo(null);
          notify(t("Pembayaran diterima, episode terbuka!", "Payment received, episodes unlocked!"));
        } else if (data.status === "failed") {
          window.clearInterval(interval);
          setCheckoutError(t("Pembayaran gagal atau kedaluwarsa.", "Payment failed or expired."));
          setCheckoutStage("select");
        }
      } catch {
        // keep polling; a transient network error shouldn't cancel the wait.
      }
    }, 4000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutStage, checkoutInfo]);

  const copyVaNumber = (value: string) => {
    navigator.clipboard?.writeText(value).then(() => notify(t("Nomor VA disalin.", "VA number copied."))).catch(() => undefined);
  };

  const openDrama = (drama: Drama) => {
    setSelectedDrama(drama);
    setWatchHistory((current) => {
      const next = [drama, ...current.filter((item) => item.id !== drama.id)].slice(0, 40);
      try { localStorage.setItem("pintumedia.watch-history", JSON.stringify(next)); } catch { /* History is optional. */ }
      return next;
    });
    setWatching(false);
    setEpisodeMenuOpen(false);
    setEpisode(1);
    setSearchOpen(false);
    setProfileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goHome = () => {
    setProfileOpen(false);
    setProfileView("main");
    setSelectedDrama(null);
    setWatching(false);
    setEpisodeMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goLanding = () => {
    setPlatform("DramaVerse");
    setPlatformOpen(false);
    setLanguageOpen(false);
    setSearchOpen(false);
    setSearchQuery("");
    goHome();
  };

  const openProfile = () => {
    profileReturnRef.current = { drama: selectedDrama, scrollY: window.scrollY };
    setSelectedDrama(null);
    setWatching(false);
    setPlatformOpen(false);
    setSearchOpen(false);
    setProfileOpen(true);
    setProfileView("main");
    setProfileNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const backFromProfile = () => {
    if (profileView !== "main") {
      setProfileView("main");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const previous = profileReturnRef.current;
    setProfileOpen(false);
    setSelectedDrama(previous.drama);
    window.requestAnimationFrame(() => window.scrollTo(0, previous.scrollY));
  };

  const toggleFavorite = (drama: Drama) => {
    setFavoriteDramas((current) => {
      const exists = current.some((item) => item.id === drama.id);
      const next = exists ? current.filter((item) => item.id !== drama.id) : [drama, ...current];
      try { localStorage.setItem("pintumedia.favorites", JSON.stringify(next)); } catch { /* Favorites are optional. */ }
      return next;
    });
  };

  const selectProfileDrama = (drama: Drama) => openDrama(drama);

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
      openPaywall();
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
        <button className="brand" onClick={goLanding} aria-label="PintuMedia beranda">
          <span className="brand-mark"><Image src="/brand/pintumedia-logo.jpg" alt="" width={54} height={54} priority /></span>
          <span>Pintumedia</span>
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
          <button className="profile-button" aria-label={t("Buka profil", "Open profile")} aria-pressed={profileOpen} onClick={openProfile}>
            <UserRound size={23} />
          </button>
        </div>
      </div>
    </header>
  );

  return (
    <main className={profileOpen ? "profile-main" : "film-main"}>
      {header}

      {profileOpen && !selectedDrama && <ProfilePage t={t} view={profileView} onView={setProfileView} history={watchHistory} favorites={favoriteDramas} onSelectDrama={selectProfileDrama} onToggleFavorite={toggleFavorite} onBack={backFromProfile} onAffiliateStart={() => setProfileNotice(t("Pendaftaran akun dan affiliate belum aktif. Fitur ini memerlukan autentikasi dan pencatatan komisi PintuMedia.", "Account and affiliate registration are not active yet. This requires PintuMedia authentication and commission tracking."))} notice={profileNotice} />}

      {!profileOpen && !selectedDrama && (
        <div className="catalog-page" aria-busy={catalogLoading}>
          {catalogLoading ? <p className="catalog-empty" role="status">{t("Memuat drama...", "Loading dramas...")}</p> : !catalog.length && <p className="catalog-empty" role="status">{catalogResult.error ? t("Katalog belum dapat dimuat. Silakan coba lagi nanti.", "The catalog could not be loaded. Please try again later.") : t(`Belum ada drama untuk ${platform}.`, `No dramas available for ${platform} yet.`)}</p>}
          {!catalogLoading && catalogResult.upstreamUnavailable && <p className="catalog-notice" role="status">{t(`API ${platform} sedang tidak merespons. Katalog contoh tidak ditampilkan agar tidak menyesatkan. Silakan coba lagi.`, `The ${platform} API is not responding. A sample catalog is not shown because it would be misleading. Please try again.`)}</p>}
          {!catalogLoading && catalogResult.externalOnly && <p className="catalog-notice" role="status">{t("Bstation memakai tautan resmi. Tambahkan hanya video yang Anda punya izin untuk didistribusikan.", "Bstation uses an official handoff. Add only videos you are licensed to distribute.")} <a href="https://www.bilibili.tv/id" target="_blank" rel="noopener noreferrer">{t("Buka Bstation", "Open Bstation")}</a></p>}
          {!catalogLoading && catalogResult.integrationUnavailable && <p className="catalog-notice" role="status">{t(`${platform} ada di picker referensi, tetapi belum tersedia di paket API NunoDrama yang aktif.`, `${platform} appears in the reference picker but is not available in the active NunoDrama API package.`)}</p>}
          {!!watchHistory.length && <ContinueWatching dramas={watchHistory} onSelect={openDrama} onRemove={(drama) => setWatchHistory((current) => {
            const next = current.filter((item) => item.id !== drama.id);
            try { localStorage.setItem("pintumedia.watch-history", JSON.stringify(next)); } catch { /* History is optional. */ }
            return next;
          })} t={t} />}
          {!!catalog.length && <RecommendationShelf dramas={catalog.slice(0, 6)} provider={platform} onSelect={openDrama} onMore={() => document.getElementById("semua-drama")?.scrollIntoView({ behavior: "smooth", block: "start" })} t={t} />}
          {!!catalog.length && <div id="semua-drama"><DramaShelf title={t("Semua Drama", "All dramas")} moreLabel={t("Selengkapnya", "View all")} lessLabel={t("Lebih sedikit", "Show less")} dramas={catalog} onSelect={openDrama} showAll /></div>}
          {!!catalog.length && <div ref={catalogSentinelRef} className="catalog-sentinel" aria-live="polite">{catalogLoadingMore ? <><span className="video-spinner" /> {t("Memuat film berikutnya...", "Loading more titles...")}</> : !catalogResult.hasMore ? t("Semua film dari API sudah ditampilkan.", "All titles from the API are displayed.") : null}</div>}
        </div>
      )}

      {!profileOpen && selectedDrama && !watching && (
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
              <button className="favorite-toggle" onClick={() => toggleFavorite(selectedDrama)} aria-pressed={favoriteDramas.some((item) => item.id === selectedDrama.id)}><Heart size={18} fill={favoriteDramas.some((item) => item.id === selectedDrama.id) ? "currentColor" : "none"} />{favoriteDramas.some((item) => item.id === selectedDrama.id) ? t("Hapus dari Favorit", "Remove from Favorites") : t("Tambah ke Favorit", "Add to Favorites")}</button>
            </div>
          </div>
        </section>
      )}

      {!profileOpen && selectedDrama && watching && (
        <section className="watch-page">
          <div className="watch-stage">
            <div className="watch-toolbar">
              <button className="watch-back" onClick={backToDetail}><ArrowLeft size={27} /> <span>{t("Kembali", "Back")}</span></button>
              <div className="watch-heading"><strong>{selectedDrama.title}</strong><small>Episode {episode}</small></div>
              <div className="watch-actions">
                <button className="watch-lock" onClick={() => { if (!unlocked) openPaywall(); }} aria-label={unlocked ? t("Episode terbuka", "Episodes unlocked") : t("Buka episode premium", "Unlock premium episodes")}><LockKeyhole size={26} /></button>
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

      {!profileOpen && <footer className="site-footer"><div className="site-footer-inner"><p>{t("PintuMedia : Request Film Aplikasi", "PintuMedia: Request a movie or app")}</p><a href="https://www.instagram.com/pintumedia.id" target="_blank" rel="noopener noreferrer">{t("By DM", "By DM")} <ExternalLink size={16} aria-hidden="true" /></a><span>© 2026</span></div></footer>}

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
            {checkoutStage === "select" ? (
              <>
                <p>{t("Episode 1–5 gratis. Pilih akses untuk melanjutkan cerita.", "Episodes 1–5 are free. Choose a plan to continue.")}</p>
                <div className="plan-list">
                  {Object.entries(plans).map(([id, item]) => (
                    <button className={plan === id ? "selected" : ""} key={id} onClick={() => setPlan(id as PlanId)}>
                      <i>{plan === id && <Check size={14} />}</i>
                      <span><strong>{t(item.label, id === "series" ? "Unlock this drama" : id === "monthly" ? "Monthly plan" : "7-day plan")}</strong><small>{t(item.meta, id === "series" ? "Lifetime access" : "All dramas")}</small></span>
                      <b>{formatIDR(planPrices[id as PlanId])}</b>
                    </button>
                  ))}
                </div>
                <div className="checkout-field">
                  <label htmlFor="checkout-email">{t("Email untuk menerima akses", "Email to receive access")}</label>
                  <input id="checkout-email" type="email" inputMode="email" value={checkoutEmail} onChange={(event) => setCheckoutEmail(event.target.value)} placeholder="nama@email.com" />
                </div>
                {checkoutError && <p className="checkout-error" role="alert">{checkoutError}</p>}
                <button className="watch-now wide" disabled={checkoutLoading} onClick={handleCheckout}>
                  {checkoutLoading ? <Loader2 size={18} className="spin" /> : t("Lanjut bayar", "Continue to pay")}
                </button>
              </>
            ) : checkoutInfo && (() => {
              const checkout = checkoutInfo.checkout;
              return (
                <div className="va-box">
                  {checkout.method === "virtual_account" ? (
                    <>
                      <p className="payment-message">{t("Transfer sesuai nominal ke Virtual Account berikut. Episode terbuka otomatis begitu pembayaran terverifikasi — tidak perlu konfirmasi manual.", "Transfer the exact amount to this Virtual Account. Episodes unlock automatically once payment is verified — no manual confirmation needed.")}</p>
                      <div className="va-row"><small>{t("Bank", "Bank")}</small><strong>{checkout.bankCode}</strong></div>
                      <div className="va-row">
                        <small>{t("Nomor Virtual Account", "Virtual Account number")}</small>
                        <strong>{checkout.vaNumber}</strong>
                        <button type="button" className="va-copy" onClick={() => copyVaNumber(checkout.vaNumber)} aria-label={t("Salin nomor VA", "Copy VA number")}><Copy size={16} /></button>
                      </div>
                      <div className="va-row"><small>{t("Jumlah", "Amount")}</small><strong>{formatIDR(planPrices[plan])}</strong></div>
                    </>
                  ) : (
                    <>
                      <p className="payment-message">{t("Selesaikan pembayaran di halaman berikut, lalu kembali ke sini — episode terbuka otomatis.", "Finish payment on the next page, then return here — episodes unlock automatically.")}</p>
                      <a className="watch-now wide" href={checkout.checkoutUrl} target="_blank" rel="noopener noreferrer">{t("Buka halaman pembayaran", "Open payment page")} <ExternalLink size={16} /></a>
                    </>
                  )}
                  <p className="payment-message"><Loader2 size={14} className="spin" /> {t("Menunggu pembayaran...", "Waiting for payment...")}</p>
                  {checkoutError && <p className="checkout-error" role="alert">{checkoutError}</p>}
                </div>
              );
            })()}
          </section>
        </div>
      )}

      {/* Traktir kopi dinonaktifkan sementara (item #6) — kode disengaja tidak dihapus. */}
      {false && !profileOpen && <button className="coffee-button" aria-label={t("Traktir kopi", "Buy us a coffee")} title={t("Traktir kopi", "Buy us a coffee")} onClick={() => setCoffeeOpen(true)}><Coffee size={29} /></button>}
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

function ProfilePage({ t, view, onView, history, favorites, onSelectDrama, onToggleFavorite, onBack, onAffiliateStart, notice }: {
  t: (id: string, en: string) => string;
  view: ProfileView;
  onView: (view: ProfileView) => void;
  history: Drama[];
  favorites: Drama[];
  onSelectDrama: (drama: Drama) => void;
  onToggleFavorite: (drama: Drama) => void;
  onBack: () => void;
  onAffiliateStart: () => void;
  notice: string;
}) {
  const helpMessage = encodeURIComponent("Halo PintuMedia, saya butuh bantuan.");
  const whatsappUrl = `https://wa.me/?text=${helpMessage}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent("https://mediumpurple-lyrebird-983556.hostingersite.com")}&text=${helpMessage}`;
  const titleByView: Record<ProfileView, string> = {
    main: t("Profil", "Profile"), history: t("Riwayat Tontonan", "Watch History"), favorites: t("Daftar Favorit", "Favorites"),
    download: t("Download App", "Download App"), affiliate: t("Program Affiliate", "Affiliate Program"), help: t("Bantuan", "Help"),
  };
  const items: { view: ProfileView; label: string; icon: typeof History }[] = [
    { view: "favorites", label: t("Daftar Favorit", "Favorites"), icon: ListMusic },
    { view: "download", label: t("Download App", "Download App"), icon: Smartphone },
    { view: "affiliate", label: t("Program Affiliate", "Affiliate Program"), icon: Share2 },
    { view: "help", label: t("Bantuan", "Help"), icon: LifeBuoy },
  ];
  const list = view === "history" ? history : favorites;
  const emptyText = view === "history" ? t("Drama yang kamu tonton akan muncul di sini.", "Dramas you watch will appear here.") : t("Belum ada drama favorit. Tekan ikon hati pada halaman drama untuk menyimpannya.", "No favorite dramas yet. Use the heart on a drama page to save it.");
  return <section className={`profile-page profile-view-${view}`} aria-label={titleByView[view]}>
    {view === "main" && <button className="profile-mobile-return" onClick={onBack}><ArrowLeft size={18} />{t("Kembali ke film", "Back to films")}</button>}
    {view === "main" && <><div className="profile-account-card"><div className="profile-user"><span className="profile-avatar">G</span><div><strong>Guest</strong><small>—</small></div><button onClick={onAffiliateStart}><LogIn size={16} />{t("Masuk", "Sign in")}</button></div>
    <div className="profile-login-banner"><strong>{t("Mulai Nonton di PintuMedia", "Start Watching on PintuMedia")}</strong><span>{t("Akun dan sinkronisasi tontonan segera tersedia.", "Accounts and watch syncing are coming soon.")}</span></div></div>{notice && <p className="affiliate-notice" role="status">{notice}</p>}</>}
    <div className="profile-heading"><button className="profile-back" onClick={onBack} aria-label={view === "main" ? t("Kembali ke film", "Back to films") : t("Kembali", "Back")}><ArrowLeft size={24} /></button><div><span className="profile-kicker">PINTUMEDIA</span><h1>{titleByView[view]}</h1></div></div>
    {view === "main" && <div className="profile-card-list">
      {items.map(({ view: target, label, icon: Icon }) => <button className="profile-menu-card" key={target} onClick={() => onView(target)}><span className="profile-menu-icon"><Icon size={25} /></span><strong>{label}</strong><ArrowRight size={22} /></button>)}
    </div>}
    {(view === "history" || view === "favorites") && <div className="profile-drama-list">
      {!list.length && <p className="profile-empty">{emptyText}</p>}
      {list.map((drama) => <div className="profile-drama-row" key={drama.id}><button className="profile-drama-open" onClick={() => onSelectDrama(drama)}><span><Poster drama={drama} /></span><strong>{drama.title}</strong><ArrowRight size={20} /></button>{view === "favorites" && <button className="profile-remove-favorite" aria-label={t("Hapus dari favorit", "Remove from favorites")} onClick={() => onToggleFavorite(drama)}><Heart size={19} fill="currentColor" /></button>}</div>)}
    </div>}
    {view === "download" && <div className="profile-info-panel"><span className="profile-info-icon"><Smartphone size={42} /></span><h2>{t("Akses PintuMedia dari layar utama", "Access PintuMedia from your home screen")}</h2><p>{t("Gunakan menu browser lalu pilih Tambahkan ke Layar Utama. Ini membuat pintasan situs; aplikasi native belum tersedia.", "Open your browser menu and choose Add to Home Screen. This creates a website shortcut; a native app is not available yet.")}</p></div>}
    {view === "affiliate" && <AffiliatePage t={t} onStart={onAffiliateStart} notice={notice} />}
    {view === "help" && <div className="profile-info-panel profile-support-panel"><span className="profile-info-icon"><LifeBuoy size={42} /></span><h2>{t("Hubungi Customer Service", "Contact Customer Service")}</h2><p>{t("Pilih kanal bantuan. Pesan awal sudah disiapkan, kamu bisa menambahkan detail pertanyaan sebelum mengirim.", "Choose a support channel. A starter message is ready; add the details of your question before sending.")}</p><div className="profile-help-actions"><a href={whatsappUrl} target="_blank" rel="noopener noreferrer">WhatsApp CS</a><a href={telegramUrl} target="_blank" rel="noopener noreferrer">Telegram CS</a></div></div>}
  </section>;
}

function ContinueWatching({ dramas, onSelect, onRemove, t }: { dramas: Drama[]; onSelect: (drama: Drama) => void; onRemove: (drama: Drama) => void; t: (id: string, en: string) => string }) {
  return <section className="continue-section" aria-label={t("Lanjutkan Menonton", "Continue watching")}>
    <div className="section-head"><h2>{t("Lanjutkan Menonton", "Continue Watching")}</h2></div>
    <div className="continue-grid">
      {dramas.slice(0, 4).map((drama) => <article className="continue-item" key={drama.id}>
        <button className="continue-card" onClick={() => onSelect(drama)}>
          <span className="poster-wrap"><Poster drama={drama} /><i>Ep 1</i><small className="continue-provider">{platforms.find((item) => item.slug === drama.sourceProvider)?.name ?? "PintuMedia"}</small><em><Play size={22} fill="currentColor" /></em></span>
          <strong>{drama.title}</strong>
        </button>
        <button className="continue-remove" onClick={() => onRemove(drama)} aria-label={t(`Hapus ${drama.title} dari riwayat`, `Remove ${drama.title} from history`)}><X size={17} /></button>
      </article>)}
    </div>
  </section>;
}

function RecommendationShelf({ dramas, provider, onSelect, onMore, t }: { dramas: Drama[]; provider: string; onSelect: (drama: Drama) => void; onMore: () => void; t: (id: string, en: string) => string }) {
  return <section className="recommendation-section" aria-label={t("Rekomendasi", "Recommendations")}>
    <div className="recommendation-heading">
      <span className="recommendation-icon"><Sparkles size={24} /></span>
      <div><h2>{t("Rekomendasi", "Recommendations")}</h2><p>{t(`Pilihan drama pendek untukmu di ${provider}`, `Short-drama picks for you on ${provider}`)}</p></div>
      <button onClick={onMore}>{t("Selengkapnya", "View all")} <ChevronRight size={18} /></button>
    </div>
    <div className="drama-grid recommendation-grid">
      {dramas.map((drama) => <button className="drama-card" key={drama.id} onClick={() => onSelect(drama)}>
        <span className="poster-wrap"><Poster drama={drama} /><b className="recommendation-hot">HOT</b><small className="recommendation-provider">{provider}</small>{drama.spriteX === undefined && <i>{drama.episodes > 0 ? `${drama.episodes} EP` : "EP"}</i>}<em><Play size={23} fill="currentColor" /></em></span>
        <strong>{drama.title}</strong>
      </button>)}
    </div>
  </section>;
}

function AffiliatePage({ t, onStart, notice }: { t: (id: string, en: string) => string; onStart: () => void; notice: string }) {
  const steps = [
    { title: t("Daftar Akun", "Create an Account"), copy: t("Pendaftaran akun gratis", "Free account registration"), icon: UserRoundPlus },
    { title: t("Bagikan Link Referral", "Share Your Referral Link"), copy: t("Sebarkan link referral ke berbagai sosial media", "Share your referral link on social media"), icon: Share2 },
    { title: t("Dapatkan Komisi", "Earn Commission"), copy: t("Komisi mengikuti ketentuan resmi PintuMedia", "Commission follows PintuMedia's official terms"), icon: BadgeDollarSign },
  ];
  return <div className="affiliate-page">
    <div className="affiliate-hero"><div className="affiliate-art"><Share2 size={58} /><span>✦　✦　✦</span></div><h2>{t("Bagikan PintuMedia dan dapatkan komisi setelah program resmi dibuka", "Share PintuMedia and earn commission once the program officially launches")}</h2></div>
    <h3>{t("Cukup 3 Langkah", "Just 3 Steps")}</h3>
    <div className="affiliate-steps">{steps.map(({ title, copy, icon: Icon }, index) => <article key={title}><span className="affiliate-step-icon"><Icon size={28} /></span><strong>{title}</strong><small>{copy}</small><i>0{index + 1}</i></article>)}</div>
    <button className="affiliate-join" onClick={onStart}>{t("Mulai Jadi Affiliate", "Become an Affiliate")}</button>
    <p className="affiliate-disclaimer">{t("Program referral PintuMedia belum aktif. Link referral, komisi, dan pembayaran akan tersedia setelah backend akun dan aturan program disiapkan.", "PintuMedia referrals are not active yet. Referral links, commissions, and payouts will be available after account backend and program terms are set up.")}</p>
    {notice && <p className="affiliate-notice" role="status">{notice}</p>}
  </div>;
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
