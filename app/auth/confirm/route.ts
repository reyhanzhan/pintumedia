import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase's PKCE email links (confirm signup, magic link, password reset)
// land here with ?code=... — exchange it for a session, then send the user
// back to the app. Without this route the code param just sits unused on
// whatever page Supabase's Site URL points at.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
