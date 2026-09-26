"use client";

import { useState } from "react";
import Image from "next/image";
import type { Drama } from "@/lib/catalog";

export function Poster({ drama }: { drama: Drama }) {
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
