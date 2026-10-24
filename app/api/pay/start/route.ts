import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { priceFor } from "@/lib/pricing";
import { availability } from "@/lib/paymentConfig";
import { siteUrl } from "@/lib/paymentConfig";
import { gmdToUsd } from "@/lib/paymentMath";
import { isPayMethod } from "@/lib/paymentMethods";
import { startCheckout } from "@/lib/payments/start";

export const dynamic = "force-dynamic";

// The student taps "Continue". We work out the price HERE on the server (never trusting
// the browser), ask the payment company for a checkout page, and send its address back.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { method?: unknown } | null;
  if (!isPayMethod(body?.method)) {
    return NextResponse.json({ error: "Unknown payment method." }, { status: 400 });
  }
  const method = body.method;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, learning_mode, payment_status, referral_discount")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  if (profile.payment_status === "cleared") {
    return NextResponse.json({ error: "You are already cleared. No payment needed." }, { status: 400 });
  }

  let db;
  try {
    db = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Online payments are not set up yet." }, { status: 503 });
  }

  const { data: rate } = await db.rpc("get_gmd_per_usd");
  const gmdPerUsd = rate === null || rate === undefined ? null : Number(rate);
  const avail = availability(process.env, gmdPerUsd)[method];
  if (!avail.ok || !avail.provider) {
    return NextResponse.json({ error: "This payment method is not available right now. Please use WhatsApp." }, { status: 503 });
  }

  const price = priceFor(profile.learning_mode, !!profile.referral_discount).final;
  const amountUsd = method === "crypto" ? gmdToUsd(price, gmdPerUsd ?? 0) : null;
  if (method === "crypto" && amountUsd === null) {
    return NextResponse.json({ error: "The crypto price is not set up yet." }, { status: 503 });
  }

  // Simple spam guard: at most 10 new checkouts per hour per student.
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", hourAgo);
  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: "Too many attempts. Please wait a little and try again." }, { status: 429 });
  }

  // Reuse a recent unfinished checkout for the same method and price.
  const fifteenAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: existing } = await db
    .from("payments")
    .select("id, checkout_url, amount_gmd")
    .eq("user_id", user.id)
    .eq("method", method)
    .eq("status", "pending")
    .eq("amount_gmd", price)
    .gte("created_at", fifteenAgo)
    .not("checkout_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.checkout_url) {
    return NextResponse.json({ url: existing.checkout_url, payment: existing.id });
  }

  const { data: row, error: insErr } = await db
    .from("payments")
    .insert({ user_id: user.id, method, provider: avail.provider, amount_gmd: price, amount_usd: amountUsd })
    .select("id")
    .single();
  if (insErr || !row) {
    return NextResponse.json({ error: "Could not start the payment. Please try again." }, { status: 500 });
  }

  const origin = new URL(req.url).origin;
  const result = await startCheckout({
    method,
    provider: avail.provider,
    paymentId: row.id,
    amountGmd: price,
    amountUsd,
    studentName: profile.full_name || user.email || "student",
    site: siteUrl(process.env, origin),
    env: process.env,
  });

  if (!result.ok) {
    await db.from("payments").update({ status: "failed", note: result.error }).eq("id", row.id);
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  await db.from("payments").update({ checkout_url: result.url, provider_ref: result.ref }).eq("id", row.id);
  return NextResponse.json({ url: result.url, payment: row.id });
}
