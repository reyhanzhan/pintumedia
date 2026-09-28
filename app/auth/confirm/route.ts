import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase's PKCE email links (confirm signup, magic link, password reset)
// land here with ?code=... — exchange it for a session, then send the user
// back to the app. Without this route the code param just sits unused on
// whatever page Supabase's Site URL points at.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  // Behind Hostinger's reverse proxy, request.url resolves to the internal
  // bind address (0.0.0.0:3000) instead of the public domain — build the
  // redirect target from the app's known public URL instead.
  const origin = process.env.NEXT_PUBLIC_APP_URL || `${url.protocol}//${request.headers.get("x-forwarded-host") ?? url.host}`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}${next.includes("?") ? "&" : "?"}confirmed=1`);
    console.error("[auth/confirm] exchangeCodeForSession failed:", error.message);
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
