import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Play } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { platforms } from "@/lib/platforms";
import { Poster } from "@/components/poster";
import type { Drama } from "@/lib/catalog";

export const metadata = { title: "Rekomendasi — PintuMedia" };
// Admin-curated picks can change anytime from the admin panel; never cache this at build time.
export const dynamic = "force-dynamic";

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

export default async function RekomendasiPage() {
  const settings = await getSettings();
  const dramas = settings.recommendedDramas;

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
        {!dramas.length && <p style={{ color: "#8e9bb0" }}>Belum ada drama rekomendasi yang dipilih admin.</p>}
        <div className="drama-grid recommendation-grid">
          {dramas.map((drama) => {
            const providerLabel = platforms.find((item) => item.slug === drama.sourceProvider)?.name ?? "PintuMedia";
            return (
              <Link className="drama-card" href={dramaHref(drama)} key={String(drama.id)}>
                <span className="poster-wrap">
                  <Poster drama={drama} />
                  <b className="recommendation-hot">HOT</b>
                  <small className="recommendation-provider">{providerLabel}</small>
                  {drama.spriteX === undefined && <i>{drama.episodes > 0 ? `${drama.episodes} EP` : "EP"}</i>}
                  <em><Play size={23} fill="currentColor" /></em>
                </span>
                <strong>{drama.title}</strong>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
