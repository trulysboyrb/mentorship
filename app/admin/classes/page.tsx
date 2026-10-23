import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import ClassManager from "@/components/ClassManager";
import type { ClassRow } from "@/lib/classes";

export default async function AdminClassesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (me?.role !== "admin") redirect("/dashboard");

  const { data, error } = await supabase
    .from("live_classes")
    .select("id, title, description, starts_at, duration_minutes, kind, join_url, location")
    .order("starts_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <AdminNav current="/admin/classes" />
      <h2 className="mt-10 text-3xl font-black tracking-tight">Live classes</h2>
      {error ? (
        <p className="mt-6 break-words text-sm text-danger">
          Could not load classes: {error.message}. Did you run the Phase 9 SQL?
        </p>
      ) : (
        <ClassManager items={(data ?? []) as ClassRow[]} />
      )}
    </main>
  );
}
