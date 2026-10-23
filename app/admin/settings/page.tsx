import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import MaxDevicesForm from "@/components/MaxDevicesForm";
import PayoutSettingsForm from "@/components/PayoutSettingsForm";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (me?.role !== "admin") redirect("/dashboard");

  const [{ data: max }, { data: reward }, { data: minPayout }] = await Promise.all([
    supabase.rpc("max_devices"),
    supabase.rpc("referral_reward"),
    supabase.rpc("min_payout"),
  ]);
  const current = typeof max === "number" ? max : 2;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <AdminNav current="/admin/settings" />
      <h2 className="mt-10 text-3xl font-black tracking-tight">Settings</h2>

      <h3 className="mt-8 text-xs font-extrabold tracking-widest uppercase">Devices per student</h3>
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
    </main>
  );
}
