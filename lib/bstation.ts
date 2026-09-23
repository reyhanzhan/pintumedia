const ALLOWED_HOSTS = new Set(["bilibili.tv", "www.bilibili.tv", "bstation.tv", "www.bstation.tv"]);

export function normalizeBstationUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) {
    throw new Error("URL harus berasal dari domain resmi Bstation/Bilibili TV.");
  }
  return url.toString();
}

/**
 * Bstation handoff only: the third-party repository supplied by the user
 * scrapes pages and proxies CDN segments. We intentionally do not proxy or
 * re-host those streams. This helper validates an official URL so licensed
 * integrations can hand viewers back to the provider.
 */
export function getBstationHandoffUrl(value: string) {
  return normalizeBstationUrl(value);
}
