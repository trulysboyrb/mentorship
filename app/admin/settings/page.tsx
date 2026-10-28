import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import MaxDevicesForm from "@/components/MaxDevicesForm";
import PayoutSettingsForm from "@/components/PayoutSettingsForm";
import CryptoRateForm from "@/components/CryptoRateForm";
import SiteSettingsForm from "@/components/SiteSettingsForm";
import CertTemplateForm from "@/components/CertTemplateForm";
import AlertSettingsForm from "@/components/AlertSettingsForm";
import SiteMessagesForm from "@/components/SiteMessagesForm";
import { getSiteStatus } from "@/lib/siteStatus";
import { getAvailability } from "@/lib/payments/available";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (me?.role !== "admin") redirect("/dashboard");

  const [{ data: max }, { data: reward }, { data: minPayout }, { data: rate }] = await Promise.all([
    supabase.rpc("max_devices"),
    supabase.rpc("referral_reward"),
    supabase.rpc("min_payout"),
    supabase.rpc("get_gmd_per_usd"),
  ]);
  const current = typeof max === "number" ? max : 2;
  const site = await getSiteStatus();
  // Whether each method's secret keys are set up on the server (ignores the on/off switches).
  const keyState = await getAvailability(supabase);
  // Admin-only settings (certificate template, alert preferences). Empty if the Phase 19 SQL is not run yet.
  const { data: adminSettings } = await supabase.rpc("admin_get_settings");
  const adm = (adminSettings ?? {}) as Record<string, unknown>;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <AdminNav current="/admin/settings" />
      <h2 className="mt-10 text-3xl font-black tracking-tight">Settings</h2>

      <SiteSettingsForm
        status={site}
        keys={{ wave: keyState.wave, card: keyState.card, crypto: keyState.crypto }}
      />

      <SiteMessagesForm status={site} />

      <CertTemplateForm
        path={typeof adm.cert_template_path === "string" ? adm.cert_template_path : ""}
        layout={typeof adm.cert_layout === "string" ? adm.cert_layout : ""}
      />

      <AlertSettingsForm
        emailReady={!!process.env.RESEND_API_KEY}
        initial={{
          payment: adm.alert_payment_on !== false,
          underpaid: adm.alert_underpaid_on !== false,
          payout: adm.alert_payout_on !== false,
          email: typeof adm.alert_email === "string" ? adm.alert_email : "",
        }}
      />

      <h3 className="mt-10 text-xs font-extrabold tracking-widest uppercase">Devices per student</h3>
      <MaxDevicesForm current={current} />
      <p className="mt-3 text-xs leading-relaxed text-muted">
        This limit is enforced by the app when a student opens their dashboard. It stops normal
        account sharing, but it is not a perfect lock against a determined person.
      </p>

      <h3 className="mt-10 text-xs font-extrabold tracking-widest uppercase">Referral rewards</h3>
      <PayoutSettingsForm
        reward={typeof reward === "number" ? reward : 500}
        minPayout={typeof minPayout === "number" ? minPayout : 500}
      />

      <h3 className="mt-10 text-xs font-extrabold tracking-widest uppercase">Crypto price</h3>
      <CryptoRateForm
        current={rate === null || rate === undefined ? null : Number(rate)}
        priceOnline={site.price_online}
        priceInPerson={site.price_in_person}
      />
    </main>
  );
}
