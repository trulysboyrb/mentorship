import type { SupabaseClient } from "@supabase/supabase-js";
import { buildAlertEmail, sendResend } from "../alertEmail";

// Called after a payment was confirmed ("cleared") or came in short ("underpaid").
// Emails the admin if RESEND_API_KEY is set and an alert email is saved in Settings.
// Never throws.
export async function emailPaymentAlert(db: SupabaseClient, paymentId: string, outcome: string): Promise<void> {
  try {
    const kind = outcome === "cleared" ? "payment" : outcome === "underpaid" ? "underpaid" : null;
    const apiKey = process.env.RESEND_API_KEY;
    if (!kind || !apiKey) return;

    const { data: settings } = await db
      .from("app_settings")
      .select("key, value")
      .in("key", ["alert_email", "alert_payment_on", "alert_underpaid_on"]);
    const s: Record<string, string> = {};
    (settings ?? []).forEach((r: { key: string; value: string }) => (s[r.key] = r.value));
    const to = (s.alert_email ?? "").trim();
    const enabled = (kind === "payment" ? s.alert_payment_on : s.alert_underpaid_on) !== "0";
    if (!to || !enabled) return;

    const { data: pay } = await db
      .from("payments")
      .select("user_id, method, provider, amount_gmd")
      .eq("id", paymentId)
      .maybeSingle();
    if (!pay || pay.provider === "mock") return; // test payments never alert
    const { data: prof } = await db.from("profiles").select("full_name, email").eq("id", pay.user_id).maybeSingle();

    const mail = buildAlertEmail({
      kind,
      student: prof?.full_name || prof?.email || "",
      amountGmd: typeof pay.amount_gmd === "number" ? pay.amount_gmd : pay.amount_gmd != null ? Number(pay.amount_gmd) : null,
      method: String(pay.method ?? ""),
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    });
    await sendResend(fetch as never, {
      apiKey,
      from: process.env.ALERT_FROM_EMAIL || "ApexTrade Alerts <onboarding@resend.dev>",
      to,
      ...mail,
    });
  } catch {
    /* alerts are a bonus; never break a payment */
  }
}
