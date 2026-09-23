import { z } from "zod";

const directUploadSchema = z.object({
  uid: z.string(),
  uploadURL: z.string().url(),
});

function cloudflareConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error("Cloudflare Stream belum dikonfigurasi di environment server.");
  }

  return { accountId, apiToken };
}

export async function createStreamDirectUpload(input?: {
  maxDurationSeconds?: number;
  creator?: string;
}) {
  const { accountId, apiToken } = cloudflareConfig();
  const origin = process.env.NEXT_PUBLIC_APP_URL;
  // Keep unsigned playback as the development default. Turn this on only
  // after the entitlement service also mints signed playback tokens.
  const requireSignedURLs = process.env.CLOUDFLARE_STREAM_REQUIRE_SIGNED_URLS === "true";
  const allowedOrigins = origin && !origin.includes("localhost") ? [new URL(origin).hostname] : undefined;

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        maxDurationSeconds: input?.maxDurationSeconds ?? 7200,
        creator: input?.creator,
        requireSignedURLs,
        ...(allowedOrigins ? { allowedOrigins } : {}),
      }),
      cache: "no-store",
    },
  );

  const payload = (await response.json()) as { success?: boolean; errors?: unknown[]; result?: unknown };
  if (!response.ok || !payload.success) {
    throw new Error(`Cloudflare Stream gagal membuat upload URL (${response.status}).`);
  }

  return directUploadSchema.parse(payload.result);
}

export function getStreamPlaybackUrls(uid: string) {
  const customerCode = process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE;
  if (!customerCode) {
    throw new Error("CLOUDFLARE_STREAM_CUSTOMER_CODE belum diisi.");
  }

  const base = `https://customer-${customerCode}.cloudflarestream.com/${uid}`;
  return {
    uid,
    hls: `${base}/manifest/video.m3u8`,
    dash: `${base}/manifest/video.mpd`,
    iframe: `${base}/iframe`,
  };
}
