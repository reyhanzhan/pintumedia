"use client";

import Image from "next/image";
import { platforms } from "../lib/platforms";
import { dramas as fallbackDramas, type Drama } from "../lib/catalog";
import { useEffect, useMemo, useState } from "react";
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
  Play,
  Search,
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDrama, setSelectedDrama] = useState<Drama | null>(null);
  const [watching, setWatching] = useState(false);
  const [episode, setEpisode] = useState(1);
  const unlocked = false;
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [plan, setPlan] = useState<PlanId>("monthly");
  const [toast, setToast] = useState("");
  const [catalogResult, setCatalogResult] = useState<{ platform: string; dramas: Drama[]; error?: boolean }>({ platform: "DramaVerse", dramas: fallbackDramas });
  const catalogLoading = catalogResult.platform !== platform;
  const catalog = useMemo(() => catalogResult.platform === platform ? catalogResult.dramas : [], [catalogResult, platform]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!platformOpen && !searchOpen && !paywallOpen && !coffeeOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [platformOpen, searchOpen, paywallOpen, coffeeOpen]);

  useEffect(() => {
    const controller = new AbortController();
    const slug = platforms.find((item) => item.name === platform)?.slug ?? "dramaverse";
    fetch(`/api/catalog?platform=${encodeURIComponent(slug)}`, { signal: controller.signal, headers: { Accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error("Catalog unavailable");
        return response.json() as Promise<{ dramas: Drama[] }>;
      })
      .then((payload) => {
        if (!controller.signal.aborted) setCatalogResult({ platform, dramas: payload.dramas });
      })
      .catch(() => {
        if (!controller.signal.aborted) setCatalogResult({ platform, dramas: [], error: true });
      });
    return () => controller.abort();
  }, [platform]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPlatformOpen(false); setSearchOpen(false); setPaywallOpen(false);
        setLanguageOpen(false); setCoffeeOpen(false);
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);

  const activePlatform = platforms.find((item) => item.name === platform) ?? platforms[0];
  const filteredPlatforms = useMemo(
    () => platforms.filter((item) => item.name.toLowerCase().includes(platformQuery.trim().toLowerCase())),
    [platformQuery],
  );
  const searchResults = useMemo(
    () => catalog.filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase())),
    [catalog, searchQuery],
  );

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const openDrama = (drama: Drama) => {
    setSelectedDrama(drama);
    setWatching(false);
    setEpisode(1);
    setSearchOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goHome = () => {
    setSelectedDrama(null);
    setWatching(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startWatching = () => {
    setWatching(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const backToDetail = () => {
    setWatching(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const chooseEpisode = (value: number) => {
    if (value > 5 && !unlocked) {
      setPaywallOpen(true);
      return;
    }
    setEpisode(value);
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
          <button className="platform-pill" aria-haspopup="dialog" aria-expanded={platformOpen} onClick={() => { setPlatformQuery(""); setPlatformOpen(true); }}>
            <Image src={activePlatform.icon} alt="" width={27} height={27} />
            <strong>{platform}</strong>
          </button>
          <div className="language-control">
            <button className="language-pill" aria-label={t("Pilih bahasa", "Choose language")} aria-expanded={languageOpen} onClick={() => setLanguageOpen(!languageOpen)}>
              <Globe2 size={20} /><strong>{language.toUpperCase()}</strong>
              <span className={language === "en" ? "flag-en" : ""} aria-hidden="true" />
              <ChevronDown size={13} />
            </button>
            {languageOpen && <>
              <button className="language-dismiss" aria-label={t("Tutup pilihan bahasa", "Close language menu")} onClick={() => setLanguageOpen(false)} />
              <div className="language-menu">
                {(["id", "en"] as const).map((code) => <button key={code} aria-pressed={language === code} onClick={() => { setLanguage(code); setLanguageOpen(false); }}>
                  <span>{code === "id" ? "Bahasa Indonesia" : "English"}</span>{language === code && <Check size={16} />}
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
          {!!catalog.length && <DramaShelf title={t("Terbaru", "Latest")} moreLabel={t("Selengkapnya", "View all")} lessLabel={t("Lebih sedikit", "Show less")} dramas={catalog} onSelect={openDrama} />}
          {catalog.length > 12 && <DramaShelf title={t("Untuk Anda", "For you")} moreLabel={t("Selengkapnya", "View all")} lessLabel={t("Lebih sedikit", "Show less")} dramas={catalog.slice(12)} onSelect={openDrama} />}
        </div>
      )}

      {selectedDrama && !watching && (
        <section className="detail-page">
          <button className="back-button" onClick={goHome}><ArrowLeft size={18} /> {t("Kembali", "Back")}</button>
          <div className="detail-layout">
            <div className="detail-poster">
              <Poster drama={selectedDrama} />
              {selectedDrama.spriteX === undefined && <span className="detail-badge">{selectedDrama.episodes} EP</span>}
            </div>
            <div className="detail-copy">
              <h1>{selectedDrama.title}</h1>
              <div className="detail-meta"><Play size={15} /> {selectedDrama.episodes} Episode <b>{platform.toUpperCase()}</b></div>
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
          <button className="back-button" onClick={backToDetail}><ArrowLeft size={18} /> {t("Detail drama", "Drama details")}</button>
          <div className="watch-title">
            <div><small>{t("SEDANG DIPUTAR", "NOW PLAYING")}</small><h1>{selectedDrama.title}</h1></div>
            <span>{unlocked ? t("Semua episode terbuka", "All episodes unlocked") : t("Episode 1–5 gratis", "Episodes 1–5 free")}</span>
          </div>
          <div className="watch-layout">
            <div className="video-shell">
              <div className="video-poster"><Poster drama={selectedDrama} /></div>
              <div className="video-overlay" />
              <button className="video-play" onClick={() => notify(`Memutar episode ${episode} (demo)`)}><Play fill="currentColor" /></button>
              <div className="video-caption"><small>EPISODE {episode}</small><strong>{selectedDrama.title}</strong></div>
              <div className="video-progress"><i /><span>00:00 / 02:18</span></div>
            </div>
            <aside className="episode-list">
              <div><strong>{t("Daftar Episode", "Episodes")}</strong><small>{selectedDrama.episodes} episode</small></div>
              {Array.from({ length: selectedDrama.episodes }, (_, index) => index + 1).map((number) => {
                const locked = number > 5 && !unlocked;
                return (
                  <button key={number} className={episode === number ? "active" : ""} onClick={() => chooseEpisode(number)}>
                    <span>{String(number).padStart(2, "0")}</span>
                    <span><strong>Episode {number}</strong><small>{number <= 5 ? t("Gratis", "Free") : "Premium"}</small></span>
                    {locked ? <LockKeyhole size={15} /> : <Play size={14} fill="currentColor" />}
                  </button>
                );
              })}
            </aside>
          </div>
        </section>
      )}

      <footer className="site-footer"><div className="site-footer-inner"><p>PintuMedia : <a href="https://github.com/reyhanzhan" target="_blank" rel="noopener noreferrer">By Reyhan <ExternalLink size={16} aria-hidden="true" /></a></p><span>© 2026</span></div></footer>

      {platformOpen && (
        <div className="modal-backdrop" onMouseDown={() => setPlatformOpen(false)}>
          <section className="platform-picker" role="dialog" aria-modal="true" aria-label={t("Pilih platform", "Choose platform")} onMouseDown={(event) => event.stopPropagation()}>
            <div className="picker-head">
              <label><Search size={23} /><input autoFocus value={platformQuery} onChange={(event) => setPlatformQuery(event.target.value)} placeholder={t("Cari platform...", "Search platforms...")} /></label>
              <button onClick={() => setPlatformOpen(false)} aria-label={t("Tutup", "Close")}><X /></button>
            </div>
            <div className="picker-grid">
              {filteredPlatforms.map((item) => (
                <button key={item.slug} aria-pressed={platform === item.name} className={platform === item.name ? "selected" : ""} onClick={() => { setPlatform(item.name); setPlatformOpen(false); setSearchQuery(""); goHome(); }}>
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
  if (drama.spriteX !== undefined) {
    return <span className="poster-crop" role="img" aria-label={drama.title} style={{
      backgroundImage: `url("${drama.poster}")`,
      backgroundSize: `${1861 / 228 * 100}% ${871 / 342 * 100}%`,
      backgroundPosition: `${drama.spriteX / (1861 - 228) * 100}% ${291 / (871 - 342) * 100}%`,
    }} />;
  }
  return <Image src={drama.poster} alt={drama.title} fill sizes="(max-width: 600px) 31vw, (max-width: 1080px) 23vw, 13vw" />;
}

function DramaShelf({ title, moreLabel, lessLabel, dramas: shelfDramas, onSelect }: { title: string; moreLabel: string; lessLabel: string; dramas: readonly Drama[]; onSelect: (drama: Drama) => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="drama-section">
      <div className="section-head"><h2>{title}</h2>{shelfDramas.length > 12 && <button aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? lessLabel : moreLabel} <ChevronRight size={20} /></button>}</div>
      <div className="drama-grid">
        {(expanded ? shelfDramas : shelfDramas.slice(0, 12)).map((drama) => (
          <button className="drama-card" key={drama.id} onClick={() => onSelect(drama)}>
            <span className="poster-wrap">
              <Poster drama={drama} />
              {drama.spriteX === undefined && <i>{drama.episodes} EP</i>}
              <em><Play size={23} fill="currentColor" /></em>
            </span>
            <strong>{drama.title}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}
