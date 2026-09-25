import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSessionToken, ADMIN_COOKIE_NAME } from "@/lib/admin-auth";

const inputSchema = z.object({ password: z.string().min(1) });

export async function POST(request: Request) {
  let password: string;
  try {
    ({ password } = inputSchema.parse(await request.json()));
  } catch {
    return NextResponse.json({ error: "Password wajib diisi." }, { status: 400 });
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || password !== expected) {
    return NextResponse.json({ error: "Password salah." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, createAdminSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
