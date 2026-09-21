"use client";

import {
  ChevronRight,
  CirclePlay,
  Play,
  Search,
  UserRound,
  Volume2,
} from "lucide-react";

const shows = [
  { title: "Kontrak Hati", meta: "12 Episode", tone: "poster-coral", number: "01" },
  { title: "Pulang Sebelum Pagi", meta: "8 Episode", tone: "poster-violet", number: "02" },
  { title: "Rahasia Lantai 17", meta: "10 Episode", tone: "poster-cyan", number: "03" },
  { title: "Bukan Cinta Sementara", meta: "14 Episode", tone: "poster-gold", number: "04" },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#070a12] text-white">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="NunoDrama beranda">
          <span className="brand-mark"><Play size={15} fill="currentColor" /></span>
          <span>NUNO<span>DRAMA</span></span>
        </a>

        <nav className="desktop-nav" aria-label="Navigasi utama">
          <a className="is-active" href="#top">Beranda</a>
          <a href="#ramai">Drama</a>
          <a href="#affiliate">Affiliate</a>
        </nav>

        <div className="header-actions">
          <button className="icon-button" aria-label="Cari drama"><Search size={20} /></button>
          <button className="login-button"><UserRound size={17} /> <span>Masuk</span></button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-visual" aria-hidden="true">
          <span className="hero-orbit orbit-one" />
          <span className="hero-orbit orbit-two" />
          <span className="hero-silhouette silhouette-left" />
          <span className="hero-silhouette silhouette-right" />
          <span className="hero-glass" />
        </div>
        <div className="hero-shade" />
        <div className="hero-content">
          <div className="eyebrow"><span>Serial orisinal</span><i /> Episode baru</div>
          <h1>Jarak di<br />Ujung Peron</h1>
          <div className="hero-meta">
            <span className="match">98% cocok</span>
            <span>2026</span>
            <span className="age">13+</span>
            <span>Romansa</span>
          </div>
          <p>
            Pertemuan yang terlambat, kereta terakhir, dan satu janji yang belum selesai.
            Saksikan lima episode pertama tanpa biaya.
          </p>
          <div className="hero-actions">
            <button className="primary-cta"><Play size={18} fill="currentColor" /> Mulai episode 1</button>
            <button className="secondary-cta"><CirclePlay size={19} /> Lihat trailer</button>
          </div>
          <div className="free-note"><span>5</span> episode gratis untuk semua penonton</div>
        </div>
        <button className="sound-button" aria-label="Nyalakan suara"><Volume2 size={18} /></button>
        <div className="hero-progress" aria-hidden="true"><span /></div>
      </section>

      <section className="catalog-section" id="ramai">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Pilihan minggu ini</span>
            <h2>Sedang ramai</h2>
          </div>
          <a href="#semua">Lihat semua <ChevronRight size={18} /></a>
        </div>
        <div className="show-grid">
          {shows.map((show) => (
            <article className={`show-card ${show.tone}`} key={show.title}>
              <div className="card-art">
                <span className="card-number">{show.number}</span>
                <span className="mini-brand">Nuno Original</span>
                <div className="card-monogram">{show.title.slice(0, 1)}</div>
                <button aria-label={`Putar ${show.title}`}><Play size={18} fill="currentColor" /></button>
              </div>
              <h3>{show.title}</h3>
              <p>{show.meta} · 5 gratis</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
