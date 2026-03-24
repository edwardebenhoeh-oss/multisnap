// ─── Auth Callback Route ──────────────────────────────────────────────────────
// Handles OAuth redirects (Google, etc.) and magic link confirmations.
// Supabase redirects here after the user authenticates via an external provider.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle errors from Supabase
  if (error) {
    console.error("[Auth callback] OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      `${origin}/auth?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (code) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
      );

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        console.error("[Auth callback] Code exchange failed:", exchangeError.message);
        return NextResponse.redirect(
          `${origin}/auth?error=${encodeURIComponent(exchangeError.message)}`
        );
      }

      // Success — redirect to app
      return NextResponse.redirect(`${origin}${next}`);
    } catch (err) {
      console.error("[Auth callback] Unexpected error:", err);
      return NextResponse.redirect(`${origin}/auth?error=unexpected_error`);
    }
  }

  // No code — redirect to home (handles implicit flow)
  return NextResponse.redirect(`${origin}${next}`);
}
