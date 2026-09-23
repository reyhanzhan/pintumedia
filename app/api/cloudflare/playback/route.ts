import { NextResponse } from "next/server";
import { getStreamPlaybackUrls } from "@/lib/cloudflare-stream";

export async function GET(request: Request) {
  const uid = new URL(request.url).searchParams.get("uid")?.trim() ?? "";
  if (!/^[a-zA-Z0-9_-]{8,120}$/.test(uid)) {
    return NextResponse.json({ error: "UID Cloudflare Stream tidak valid." }, { status: 400 });
  }

  try {
    return NextResponse.json(getStreamPlaybackUrls(uid), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Playback belum dikonfigurasi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
