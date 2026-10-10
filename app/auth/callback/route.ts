import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Email links (password reset, and later email confirmation) land here.
// It swaps the one-time code in the link for a real login session.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  }

  return NextResponse.redirect(
    `${origin}${safeNext === "/reset-password" ? "/reset-password" : "/login"}`
  );
}
