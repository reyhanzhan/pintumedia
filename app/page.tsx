"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Globe2,
  LockKeyhole,
  Play,
  Search,
  X,
} from "lucide-react";

const platforms = [
  { name: "DramaBox", icon: "/platform-icons/dramabox.png" },
  { name: "DramaVerse", icon: "/platform-icons/dramaverse.jpg" },
  { name: "DramaWave", icon: "/platform-icons/dramawave.png" },
  { name: "FlexTV", icon: "/platform-icons/flextv.png" },
  { name: "FlickReels", icon: "/platform-icons/flickreels.png" },
  { name: "FreeReels", icon: "/platform-icons/freereels.png" },
  { name: "GoodShort", icon: "/platform-icons/goodshort.png" },
  { name: "iDrama", icon: "/platform-icons/idrama.png" },
  { name: "Melolo", icon: "/platform-icons/melolo.jpg" },
  { name: "NetShort", icon: "/platform-icons/netshort.png" },
  { name: "ShortMax", icon: "/platform-icons/shortmax.png" },
  { name: "StardustTV", icon: "/platform-icons/stardust.png" },
  { name: "PineDrama", icon: "/platform-icons/pinedrama.png" },
  { name: "ReelShort", icon: "/platform-icons/reelshort.png" },
  { name: "TopDrama", icon: "/platform-icons/topdrama.png" },
  { name: "CubeTV", icon: "/platform-icons/cubetv.png" },
  { name: "StarShort", icon: "/platform-icons/starshort.png" },
  { name: "RapidTV", icon: "/platform-icons/rapidtv.png" },
  { name: "DramaBite", icon: "/platform-icons/dramabite.png" },
  { name: "ShortsWave", icon: "/platform-icons/shortswave.png" },
  { name: "FlareFlow", icon: "/platform-icons/flareflow.png" },
] as const;

const dramas = [
  { id: 1, title: "Pernikahan Rahasia Sang CEO", episodes: 50, poster: "/posters/poster-01.jpg", synopsis: "Seorang perempuan menyembunyikan pernikahannya dengan pewaris perusahaan. Ketika mereka dipertemukan kembali di kantor, rahasia lama mulai membuka luka dan cinta yang belum selesai." },
  { id: 2, title: "Cinta di Balik Identitas", episodes: 40, poster: "/posters/poster-02.jpg", synopsis: "Ia datang sebagai pegawai biasa, padahal seluruh perusahaan adalah milik keluarganya. Satu pertemuan tak terduga membuat penyamarannya semakin sulit dipertahankan." },
  { id: 3, title: "Tertukar Janji di Musim Hujan", episodes: 56, poster: "/posters/poster-03.jpg", synopsis: "Dua keluarga, satu janji lama, dan pernikahan yang salah nama. Di tengah kebohongan, keduanya justru menemukan rumah pada satu sama lain." },
  { id: 4, title: "Kontrak Istri Sang Pewaris", episodes: 38, poster: "/posters/poster-04.jpg", synopsis: "Kesepakatan pernikahan selama seratus hari berubah ketika sang pewaris sadar bahwa perempuan di sisinya adalah cinta yang selama ini ia cari." },
  { id: 5, title: "Kembali untuk Membalas", episodes: 36, poster: "/posters/poster-05.jpg", synopsis: "Lima tahun setelah dikhianati, ia kembali dengan nama baru dan rencana yang sempurna. Namun balas dendamnya terancam oleh perasaan yang tak pernah benar-benar padam." },
  { id: 6, title: "Saat Hati Memilih Pulang", episodes: 43, poster: "/posters/poster-06.jpg", synopsis: "Kepulangan seorang dokter muda mempertemukannya dengan cinta pertama yang masih menunggu di kota kecil mereka." },
  { id: 7, title: "Dia yang Selalu Menungguku", episodes: 65, poster: "/posters/poster-07.jpg", synopsis: "Sebuah surat yang terlambat sepuluh tahun mengubah hidup dua sahabat yang diam-diam saling mencintai." },
  { id: 8, title: "Cinta Kedua di Usia Senja", episodes: 55, poster: "/posters/poster-08.jpg", synopsis: "Dua orang yang merasa kisah mereka telah selesai menemukan keberanian untuk memulai kembali dari awal." },
  { id: 9, title: "Bayang-Bayang Masa Lalu", episodes: 69, poster: "/posters/poster-09.jpg", synopsis: "Sebuah foto lama membawa seorang jurnalis pada rahasia keluarga terbesar dan seseorang yang selama ini ia rindukan." },
  { id: 10, title: "Tiga Tahun Setelah Pergi", episodes: 80, poster: "/posters/poster-10.jpg", synopsis: "Ia kembali sebagai direktur baru, sementara mantan kekasihnya menjadi satu-satunya orang yang mengetahui alasan kepergiannya." },
  { id: 11, title: "Penulis Takdir Sang Direktur", episodes: 65, poster: "/posters/poster-11.jpg", synopsis: "Novel yang belum selesai tiba-tiba menjadi nyata, menjebak penulisnya dalam kehidupan seorang direktur dingin yang mengenal semua rahasianya." },
  { id: 12, title: "Armada Cinta Terakhir", episodes: 65, poster: "/posters/poster-12.jpg", synopsis: "Di kapal terakhir menuju pulau terpencil, dua rival harus bekerja sama dan menghadapi perasaan yang tak pernah mereka akui." },
  { id: 13, title: "CEO Asli di Pernikahanku", episodes: 64, poster: "/posters/poster-13.jpg", synopsis: "Suami sederhana yang ia nikahi ternyata adalah pemilik kerajaan bisnis. Kini keduanya harus memilih antara kepercayaan atau kekuasaan." },
  { id: 14, title: "Bukan Laut yang Dulu", episodes: 70, poster: "/posters/poster-14.jpg", synopsis: "Seorang fotografer kembali ke kota pantai dan menemukan bahwa orang yang ia tinggalkan telah menjaga semua kenangan mereka." },
  { id: 15, title: "Sangkar Cinta", episodes: 72, poster: "/posters/poster-15.jpg", synopsis: "Hubungan sempurna mereka menyimpan aturan yang menyesakkan. Saat pintu terbuka, ia harus memilih kebebasan atau cinta." },
  { id: 16, title: "Kutendang Lima Tunangan", episodes: 80, poster: "/posters/poster-16.jpg", synopsis: "Pewaris muda membatalkan lima pertunangan yang diatur keluarganya dan mengejar orang biasa yang pernah menyelamatkan hidupnya." },
] as const;

const plans = {
  series: { label: "Buka drama ini", meta: "Akses selamanya", price: "Rp25.000" },
  monthly: { label: "Paket bulanan", meta: "Semua drama", price: "Rp39.000" },
  weekly: { label: "Paket 7 hari", meta: "Semua drama", price: "Rp19.000" },
} as const;

type Drama = (typeof dramas)[number];
type PlanId = keyof typeof plans;

export default function Home() {
  const [platform, setPlatform] = useState("DramaVerse");
  const [platformOpen, setPlatformOpen] = useState(false);
  const [platformQuery, setPlatformQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDrama, setSelectedDrama] = useState<Drama | null>(null);
  const [watching, setWatching] = useState(false);
  const [episode, setEpisode] = useState(1);
  const [unlocked, setUnlocked] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [plan, setPlan] = useState<PlanId>("monthly");
  const [paymentMessage, setPaymentMessage] = useState("Pembayaran aman melalui Midtrans atau Xendit.");
  const [toast, setToast] = useState("");

  const activePlatform = platforms.find((item) => item.name === platform) ?? platforms[0];
  const filteredPlatforms = useMemo(
    () => platforms.filter((item) => item.name.toLowerCase().includes(platformQuery.toLowerCase())),
    [platformQuery],
  );
  const searchResults = useMemo(
    () => dramas.filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase())),
    [searchQuery],
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

  const startCheckout = async () => {
    const email = window.prompt("Email untuk menerima akses:");
    if (!email) return;
    setPaymentMessage("Membuat halaman pembayaran...");
    try {
      const referralCode = new URLSearchParams(window.location.search).get("ref") || undefined;
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan, email, referralCode }),
      });
      const data = (await response.json()) as { checkoutUrl?: string; error?: string };
      if (!response.ok || !data.checkoutUrl) throw new Error(data.error || "Checkout gagal dibuat.");
      window.location.href = data.checkoutUrl;
    } catch (error) {
      setPaymentMessage(error instanceof Error ? error.message : "Checkout gagal dibuat.");
    }
  };

  const header = (
    <header className="site-header">
      <button className="brand" onClick={goHome} aria-label="PintuMedia beranda">
        <span className="brand-mark">P</span>
        <span>PintuMedia</span>
      </button>
      <div className="header-actions">
        <button className="platform-pill" onClick={() => setPlatformOpen(true)}>
          <Image src={activePlatform.icon} alt="" width={27} height={27} />
          <strong>{platform}</strong>
          <ChevronDown size={14} />
        </button>
        <button className="language-pill" onClick={() => notify("Bahasa Indonesia aktif")}>
          <Globe2 size={16} />
          <strong>ID</strong>
          <span>🇮🇩</span>
          <ChevronDown size={13} />
        </button>
        <button className="search-button" aria-label="Cari drama" onClick={() => setSearchOpen(true)}>
          <Search size={23} />
        </button>
      </div>
    </header>
  );

  return (
    <main>
      {header}

      {!selectedDrama && (
        <div className="catalog-page">
          <DramaShelf title="Terbaru" dramas={dramas.slice(0, 8)} onSelect={openDrama} />
          <DramaShelf title="Untuk Anda" dramas={dramas.slice(8)} onSelect={openDrama} />
        </div>
      )}

      {selectedDrama && !watching && (
        <section className="detail-page">
          <button className="back-button" onClick={goHome}><ArrowLeft size={18} /> Kembali</button>
          <div className="detail-layout">
            <div className="detail-poster">
              <Image src={selectedDrama.poster} alt={selectedDrama.title} fill sizes="(max-width: 760px) 46vw, 300px" priority />
              <span>{selectedDrama.episodes} EP</span>
            </div>
            <div className="detail-copy">
              <h1>{selectedDrama.title}</h1>
              <div className="detail-meta"><Play size={15} /> {selectedDrama.episodes} Episode <b>{platform.toUpperCase()}</b></div>
              <article>
                <h2>Sinopsis</h2>
                <p>{selectedDrama.synopsis}</p>
              </article>
              <button className="watch-now" onClick={startWatching}><Play size={19} fill="currentColor" /> Mulai Menonton</button>
            </div>
          </div>
        </section>
      )}

      {selectedDrama && watching && (
        <section className="watch-page">
          <button className="back-button" onClick={backToDetail}><ArrowLeft size={18} /> Detail drama</button>
          <div className="watch-title">
            <div><small>SEDANG DIPUTAR</small><h1>{selectedDrama.title}</h1></div>
            <span>{unlocked ? "Semua episode terbuka" : "Episode 1–5 gratis"}</span>
          </div>
          <div className="watch-layout">
            <div className="video-shell">
              <Image src={selectedDrama.poster} alt="" fill sizes="(max-width: 900px) 100vw, 70vw" />
              <div className="video-overlay" />
              <button className="video-play" onClick={() => notify(`Memutar episode ${episode} (demo)`)}><Play fill="currentColor" /></button>
              <div className="video-caption"><small>EPISODE {episode}</small><strong>{selectedDrama.title}</strong></div>
              <div className="video-progress"><i /><span>00:00 / 02:18</span></div>
            </div>
            <aside className="episode-list">
              <div><strong>Daftar Episode</strong><small>{selectedDrama.episodes} episode</small></div>
              {Array.from({ length: 10 }, (_, index) => index + 1).map((number) => {
                const locked = number > 5 && !unlocked;
                return (
                  <button key={number} className={episode === number ? "active" : ""} onClick={() => chooseEpisode(number)}>
                    <span>{String(number).padStart(2, "0")}</span>
                    <span><strong>Episode {number}</strong><small>{number <= 5 ? "Gratis" : "Premium"}</small></span>
                    {locked ? <LockKeyhole size={15} /> : <Play size={14} fill="currentColor" />}
                  </button>
                );
              })}
            </aside>
          </div>
        </section>
      )}

      <footer className="site-footer"><span>Pintu Media</span><small>Gunakan hanya konten yang Anda miliki atau lisensikan secara sah.</small><span>© 2026</span></footer>

      {platformOpen && (
        <div className="modal-backdrop" onMouseDown={() => setPlatformOpen(false)}>
          <section className="platform-picker" role="dialog" aria-modal="true" aria-label="Pilih platform" onMouseDown={(event) => event.stopPropagation()}>
            <div className="picker-head">
              <label><Search size={23} /><input autoFocus value={platformQuery} onChange={(event) => setPlatformQuery(event.target.value)} placeholder="Cari platform..." /></label>
              <button onClick={() => setPlatformOpen(false)} aria-label="Tutup"><X /></button>
            </div>
            <div className="picker-grid">
              {filteredPlatforms.map((item) => (
                <button key={item.name} className={platform === item.name ? "selected" : ""} onClick={() => { setPlatform(item.name); setPlatformOpen(false); notify(`Berpindah ke ${item.name}`); }}>
                  <Image src={item.icon} alt={`Logo ${item.name}`} width={58} height={58} />
                  <strong>{item.name}</strong>
                  {platform === item.name && <i><Check size={13} /></i>}
                </button>
              ))}
            </div>
            <footer><span>{platformQuery ? `${filteredPlatforms.length} platform ditemukan` : `${platforms.length} platform tersedia`}</span><strong><Image src={activePlatform.icon} alt="" width={28} height={28} /> {platform}</strong></footer>
          </section>
        </div>
      )}

      {searchOpen && (
        <div className="modal-backdrop search-backdrop" onMouseDown={() => setSearchOpen(false)}>
          <section className="search-panel" role="dialog" aria-modal="true" aria-label="Cari drama" onMouseDown={(event) => event.stopPropagation()}>
            <div className="search-field"><Search size={22} /><input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Cari judul drama..." /><button onClick={() => setSearchOpen(false)}><X /></button></div>
            <div className="search-results">
              {searchResults.map((drama) => <button key={drama.id} onClick={() => openDrama(drama)}><Image src={drama.poster} alt="" width={52} height={72} /><span><strong>{drama.title}</strong><small>{drama.episodes} Episode</small></span><ChevronRight /></button>)}
              {!searchResults.length && <p>Drama tidak ditemukan.</p>}
            </div>
          </section>
        </div>
      )}

      {paywallOpen && (
        <div className="modal-backdrop" onMouseDown={() => setPaywallOpen(false)}>
          <section className="paywall" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setPaywallOpen(false)}><X /></button>
            <small className="modal-kicker">EPISODE BERIKUTNYA MENANTI</small>
            <h2>Buka semua episode</h2>
            <p>Episode 1–5 gratis. Pilih akses untuk melanjutkan cerita.</p>
            <div className="plan-list">
              {Object.entries(plans).map(([id, item]) => <button className={plan === id ? "selected" : ""} key={id} onClick={() => setPlan(id as PlanId)}><i>{plan === id && <Check size={14} />}</i><span><strong>{item.label}</strong><small>{item.meta}</small></span><b>{item.price}</b></button>)}
            </div>
            <button className="watch-now wide" onClick={startCheckout}>Lanjut ke pembayaran</button>
            <button className="demo-access" onClick={() => { setUnlocked(true); setPaywallOpen(false); notify("Akses demo aktif — semua episode terbuka"); }}>Aktifkan akses demo</button>
            <small className="payment-message">{paymentMessage}</small>
          </section>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function DramaShelf({ title, dramas: shelfDramas, onSelect }: { title: string; dramas: readonly Drama[]; onSelect: (drama: Drama) => void }) {
  return (
    <section className="drama-section">
      <div className="section-head"><h2>{title}</h2><button onClick={() => window.scrollBy({ top: 420, behavior: "smooth" })}>Selengkapnya <ChevronRight size={17} /></button></div>
      <div className="drama-grid">
        {shelfDramas.map((drama) => (
          <button className="drama-card" key={drama.id} onClick={() => onSelect(drama)}>
            <span className="poster-wrap">
              <Image src={drama.poster} alt={drama.title} fill sizes="(max-width: 560px) 31vw, (max-width: 900px) 22vw, 13vw" />
              <i>{drama.episodes} EP</i>
              <em><Play size={23} fill="currentColor" /></em>
            </span>
            <strong>{drama.title}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}
