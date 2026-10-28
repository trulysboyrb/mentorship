import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import ActivityLog from "@/components/ActivityLog";
import RealtimeRefresh from "@/components/RealtimeRefresh";
import type { AuditRow } from "@/lib/activityView";

export const metadata = { title: "Activity log" };

export default async function AdminActivityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (me?.role !== "admin") redirect("/dashboard");

  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("id, at, actor_name, action, target_label, detail")
    .order("at", { ascending: false })
    .limit(300);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <RealtimeRefresh table="admin_audit_log" />
      <AdminNav current="/admin/activity" />
      <h2 className="mt-10 text-3xl font-black tracking-tight">Activity log</h2>
      <p className="mt-2 text-sm text-muted">
        Who cleared, locked or deleted a student, gave a certificate, paid a payout or changed a setting, and when.
        &quot;Automatic&quot; means a payment cleared the student by itself.
      </p>
      {error ? (
        <p className="mt-6 break-words text-sm text-danger">
          Could not load the log: {error.message}. Did you run the Phase 18 SQL?
        </p>
      ) : (
        <ActivityLog rows={(data ?? []) as AuditRow[]} />
      )}
    </main>
  );
}
