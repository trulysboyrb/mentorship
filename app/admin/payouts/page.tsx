import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import PayoutManager, { type AdminPayout } from "@/components/PayoutManager";

export default async function AdminPayoutsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (me?.role !== "admin") redirect("/dashboard");

  const { data, error } = await supabase.rpc("admin_list_payouts");

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <AdminNav current="/admin/payouts" />
      <h2 className="mt-10 text-3xl font-black tracking-tight">Referral payouts</h2>
      <p className="mt-2 text-sm text-muted">
        When a student taps Request payout, it shows up here and in the red alert at the top of every
        admin page. Send the money (for example by Wave), then press Mark as paid.
      </p>
      {error ? (
        <p className="mt-6 break-words text-sm text-danger">
          Could not load payouts: {error.message}. Did you run the Phase 9 SQL?
        </p>
      ) : (
        <PayoutManager items={(data ?? []) as AdminPayout[]} />
      )}
    </main>
  );
}
