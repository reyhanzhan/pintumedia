import { NextResponse } from "next/server";
import { z } from "zod";
import { createStreamDirectUpload } from "@/lib/cloudflare-stream";

const bodySchema = z.object({
  maxDurationSeconds: z.number().int().positive().max(21600).optional(),
  creator: z.string().trim().max(100).optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json().catch(() => ({})));
    const upload = await createStreamDirectUpload(body);
    return NextResponse.json(upload, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tidak dapat membuat upload URL.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
