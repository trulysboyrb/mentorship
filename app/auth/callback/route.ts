import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Email links (password reset, and email confirmation) land here.
// It swaps the one-time code in the link for a real login session.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  // Email confirmation: Supabase has already confirmed the email by the time the student
  // gets here, so we show the "confirmed" page even if this browser cannot finish a login
  // (for example the link was opened on a different phone). They then sign in normally.
  if (safeNext === "/auth/confirmed") {
    const failed = !!searchParams.get("error") || !!searchParams.get("error_code");
    if (code && !failed) {
      try {
        const supabase = await createClient();
        await supabase.auth.exchangeCodeForSession(code);
        await supabase.auth.signOut();
      } catch {
        // Ignore: the email is confirmed either way.
      }
    }
    return NextResponse.redirect(`${origin}/auth/confirmed${failed ? "?error=1" : ""}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  }

  return NextResponse.redirect(
    `${origin}${safeNext === "/reset-password" ? "/reset-password" : "/login"}`
  );
}
