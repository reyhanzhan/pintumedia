"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Check, ChevronDown, ChevronRight, CirclePlay, Copy, Globe2, LockKeyhole, Play, Search, Volume2, X } from "lucide-react";

const shows = [
  { title: "Kontrak Hati", meta: "12 Episode", tone: "poster-coral", number: "01" },
  { title: "Pulang Sebelum Pagi", meta: "8 Episode", tone: "poster-violet", number: "02" },
  { title: "Rahasia Lantai 17", meta: "10 Episode", tone: "poster-cyan", number: "03" },
  { title: "Bukan Cinta Sementara", meta: "14 Episode", tone: "poster-gold", number: "04" },
];
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
const episodeTitles = ["Kereta Terakhir","Nama di Tiket Lama","Hujan yang Sama","Pesan Tak Terkirim","Di Balik Pintu Kaca","Jadwal yang Berubah","Satu Kursi Kosong","Kota Setelah Tengah Malam","Janji di Peron Tiga","Pulang Bersama"];
const plans = {
  series: { label: "Buka serial ini", meta: "Akses selamanya", price: "Rp25.000" },
  monthly: { label: "Bulanan", meta: "Semua serial · paling hemat", price: "Rp39.000" },
  weekly: { label: "7 hari", meta: "Semua serial", price: "Rp19.000" },
} as const;
type PlanId = keyof typeof plans;

export default function Home() {
  const [platform, setPlatform] = useState("DramaVerse");
  const [platformOpen, setPlatformOpen] = useState(false);
  const [platformQuery, setPlatformQuery] = useState("");
  const [episode, setEpisode] = useState(1);
  const [unlocked, setUnlocked] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [plan, setPlan] = useState<PlanId>("monthly");
  const [paymentMessage, setPaymentMessage] = useState("Pembayaran produksi memakai Midtrans atau Xendit dari server.");
  const [toast, setToast] = useState("");
  const filteredPlatforms = useMemo(() => platforms.filter((item) => item.name.toLowerCase().includes(platformQuery.toLowerCase())), [platformQuery]);
  const activePlatform = platforms.find((item) => item.name === platform) ?? platforms[0];

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };
  const chooseEpisode = (value: number) => {
    if (value > 5 && !unlocked) return setPaywallOpen(true);
    setEpisode(value);
    document.querySelector("#episodes")?.scrollIntoView({ behavior: "smooth" });
    notify("Episode " + value + " siap diputar");
  };
  const startCheckout = async () => {
    const email = window.prompt("Email untuk menerima akses:");
    if (!email) return;
    setPaymentMessage("Membuat halaman pembayaran...");
    try {
      const referralCode = new URLSearchParams(window.location.search).get("ref") || undefined;
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId: plan, email, referralCode }) });
      const data = await response.json() as { checkoutUrl?: string; error?: string };
      if (!response.ok || !data.checkoutUrl) throw new Error(data.error || "Checkout gagal dibuat.");
      window.location.href = data.checkoutUrl;
    } catch (error) {
      setPaymentMessage(error instanceof Error ? error.message : "Checkout gagal dibuat.");
    }
  };

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="PintuMedia beranda"><span className="brand-mark">P</span><span>PINTU<span>MEDIA</span></span></a>
        <div className="header-actions">
          <button className="platform-pill" onClick={() => setPlatformOpen(true)}><Image src={activePlatform.icon} alt="" width={27} height={27} /><strong>{platform}</strong><ChevronDown size={15} /></button>
          <button className="language-pill" onClick={() => notify("Bahasa Indonesia aktif")}><Globe2 size={17} /><strong>ID</strong><span>🇮🇩</span><ChevronDown size={14} /></button>
          <button className="icon-button" aria-label="Cari drama" onClick={() => notify("Pencarian judul siap digunakan")}><Search size={22} /></button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-visual" aria-hidden="true"><span className="hero-orbit orbit-one" /><span className="hero-orbit orbit-two" /><span className="hero-silhouette silhouette-left" /><span className="hero-silhouette silhouette-right" /><span className="hero-glass" /></div>
        <div className="hero-shade" />
        <div className="hero-content">
          <div className="eyebrow"><span>Serial orisinal</span><i /> Episode baru</div>
          <h1>Jarak di<br />Ujung Peron</h1>
          <div className="hero-meta"><span className="match">98% cocok</span><span>2026</span><span className="age">13+</span><span>Romansa</span></div>
          <p>Pertemuan yang terlambat, kereta terakhir, dan satu janji yang belum selesai. Saksikan lima episode pertama tanpa biaya.</p>
          <div className="hero-actions"><button className="primary-cta" onClick={() => chooseEpisode(1)}><Play size={18} fill="currentColor" /> Mulai episode 1</button><button className="secondary-cta" onClick={() => notify("Trailer demonstrasi siap")}><CirclePlay size={19} /> Lihat trailer</button></div>
          <div className="free-note"><span>5</span> episode gratis untuk semua penonton</div>
        </div>
        <button className="sound-button" aria-label="Nyalakan suara"><Volume2 size={18} /></button><div className="hero-progress"><span /></div>
      </section>

      <section className="catalog-section" id="drama">
        <div className="section-heading"><div><span className="section-kicker">Pilihan minggu ini</span><h2>Sedang ramai</h2></div><a href="#episodes">Lihat semua <ChevronRight size={18} /></a></div>
        <div className="show-grid">{shows.map((show) => <article className={"show-card " + show.tone} key={show.title}><button className="card-art" onClick={() => chooseEpisode(1)}><span className="card-number">{show.number}</span><span className="mini-brand">Pintu Original</span><span className="card-monogram">{show.title[0]}</span><i><Play size={18} fill="currentColor" /></i></button><h3>{show.title}</h3><p>{show.meta} · 5 gratis</p></article>)}</div>
      </section>

      <section className="watch-section" id="episodes">
        <div className="watch-heading"><div><span className="section-kicker">Sedang diputar</span><h2>Jarak di Ujung Peron</h2></div><div className="access-pill"><span />{unlocked ? "Semua episode terbuka (demo)" : "Episode 1–5 terbuka"}</div></div>
        <div className="watch-layout">
          <div className="player-shell"><div className="player-stage"><div className="player-pattern"><i /><i /><i /></div><button className="big-play" onClick={() => notify("Memutar episode " + episode + " (demo)")}><Play fill="currentColor" /></button><div className="player-label"><span>Episode {episode}</span><strong>{episodeTitles[episode - 1]}</strong></div><div className="licensed-note">Tambahkan video berlisensi Anda di panel admin</div></div><div className="player-bar"><Play size={15} fill="currentColor" /><div><span /></div><small>00:00 / 24:18</small></div></div>
          <aside className="episode-panel"><div className="episode-panel-head"><div><strong>Daftar episode</strong><span>10 episode</span></div><b>5 GRATIS</b></div>{episodeTitles.map((title, index) => { const number = index + 1; const locked = number > 5 && !unlocked; return <button className={"episode " + (episode === number ? "active" : "")} key={title} onClick={() => chooseEpisode(number)}><span>{String(number).padStart(2, "0")}</span><span><strong>{title}</strong><small>{22 + index} menit</small></span>{locked ? <LockKeyhole size={16} /> : <Play size={13} fill="currentColor" />}</button>; })}</aside>
        </div>
      </section>

      <section className="membership-section" id="membership"><div><span className="section-kicker">Lanjut tanpa jeda</span><h2>Satu paket untuk semua cerita.</h2><p>Buka episode 6 dan seterusnya, tonton tanpa iklan, dan akses episode baru lebih awal.</p><button className="primary-cta" onClick={() => setPaywallOpen(true)}>Lihat pilihan paket <ChevronRight size={17} /></button></div><div className="benefit-grid"><article><span>01</span><strong>Semua episode</strong><p>Termasuk serial yang sedang tayang.</p></article><article><span>02</span><strong>Tanpa iklan</strong><p>Nikmati cerita tanpa potongan.</p></article><article><span>03</span><strong>Akses lebih awal</strong><p>Tonton episode baru sebelum publik.</p></article></div></section>

      <section className="affiliate-section" id="affiliate"><div className="affiliate-copy"><span className="section-kicker">Pintu Partner</span><h2>Bagikan cerita.<br /><em>Dapatkan komisi.</em></h2><p>Dapatkan komisi 20% dari pembayaran pertama setiap teman yang bergabung melalui link Anda.</p><ul><li><b>20%</b>komisi transaksi pertama</li><li><b>30 hari</b>masa atribusi referral</li><li><b>Rp100 ribu</b>minimum pencairan</li></ul></div><div className="affiliate-card"><div className="partner-head"><span>R</span><div><strong>Partner Reyhan</strong><small>Data demonstrasi</small></div><b>Aktif</b></div><label>Komisi tersedia<strong>Rp184.500</strong><small>+Rp61.000 bulan ini</small></label><div className="metrics"><div>Klik link<b>128</b></div><div>Member baru<b>7</b></div><div>Konversi<b>5,5%</b></div></div><small>Link referral Anda</small><div className="referral"><input readOnly value="https://pintumedia.my.id/?ref=PINTU-REYHAN" /><button onClick={() => { navigator.clipboard.writeText("https://pintumedia.my.id/?ref=PINTU-REYHAN"); notify("Link referral disalin"); }}><Copy size={16} /> Salin</button></div></div></section>

      <section className="legal-note"><strong>Catatan konten:</strong> gunakan hanya film, serial, poster, musik, dan subtitle yang Anda miliki atau lisensikan secara sah.</section>
      <footer className="site-footer"><a className="brand" href="#top"><span className="brand-mark">P</span><span>PINTU<span>MEDIA</span></span></a><p>© 2026 PintuMedia. Konsep platform streaming orisinal.</p><div><a href="#membership">Paket</a><a href="#affiliate">Affiliate</a><a href="#top">Ketentuan</a></div></footer>

      {platformOpen && <div className="platform-overlay" onMouseDown={() => setPlatformOpen(false)}><section className="platform-picker" role="dialog" aria-modal="true" aria-label="Pilih platform" onMouseDown={(event) => event.stopPropagation()}><div className="picker-head"><label><Search size={24} /><input autoFocus value={platformQuery} onChange={(event) => setPlatformQuery(event.target.value)} placeholder="Cari platform..." /></label><button onClick={() => setPlatformOpen(false)} aria-label="Tutup"><X /></button></div><div className="picker-grid">{filteredPlatforms.map((item) => <button key={item.name} className={platform === item.name ? "selected" : ""} onClick={() => { setPlatform(item.name); setPlatformOpen(false); notify("Berpindah ke " + item.name); }}><Image src={item.icon} alt={"Logo " + item.name} width={58} height={58} /><strong>{item.name}</strong>{platform === item.name && <i><Check size={13} /></i>}</button>)}</div><footer><span>{platformQuery ? filteredPlatforms.length + " platform ditemukan" : platforms.length + " platform tersedia"}</span><strong><Image src={activePlatform.icon} alt="" width={28} height={28} /> {platform}</strong></footer></section></div>}

      {paywallOpen && <div className="platform-overlay" onMouseDown={() => setPaywallOpen(false)}><section className="paywall" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setPaywallOpen(false)}><X /></button><span className="section-kicker">Episode berikutnya menanti</span><h2>Buka semua episode</h2><p>Episode 1–5 gratis. Pilih akses yang paling pas untuk melanjutkan cerita.</p><div className="plan-list">{Object.entries(plans).map(([id, item]) => <button className={plan === id ? "selected" : ""} key={id} onClick={() => setPlan(id as PlanId)}><i>{plan === id && <Check size={14} />}</i><span><strong>{item.label}</strong><small>{item.meta}</small></span><b>{item.price}</b></button>)}</div><button className="primary-cta wide" onClick={startCheckout}>Lanjut ke pembayaran</button><button className="demo-access" onClick={() => { setUnlocked(true); setPaywallOpen(false); notify("Akses demo aktif — episode 6–10 terbuka"); }}>Aktifkan akses demo</button><small className="payment-message">{paymentMessage}</small></section></div>}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
