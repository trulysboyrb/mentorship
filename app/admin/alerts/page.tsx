import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import AlertList, { type AlertRow } from "@/components/AlertList";

export const metadata = { title: "Alerts" };

export default async function AdminAlertsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (me?.role !== "admin") redirect("/dashboard");

  const { data, error } = await supabase
    .from("admin_alerts")
    .select("id, at, kind, title, body, link, read_at")
    .order("at", { ascending: false })
    .limit(100);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <AdminNav current="/admin/alerts" />
      <h2 className="mt-10 text-3xl font-black tracking-tight">Alerts</h2>
      <p className="mt-2 text-sm text-muted">
        New payments, underpaid crypto payments and payout requests. Choose what you get alerts for in Settings.
      </p>
      {error ? (
        <p className="mt-6 break-words text-sm text-danger">
          Could not load alerts: {error.message}. Did you run the Phase 18 SQL?
        </p>
      ) : (
        <AlertList rows={(data ?? []) as AlertRow[]} />
      )}
    </main>
  );
}
