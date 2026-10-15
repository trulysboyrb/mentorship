import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import AnnouncementManager from "@/components/AnnouncementManager";

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  if (me?.role !== "admin") redirect("/dashboard");

  const { data } = await supabase
    .from("announcements")
    .select("id, title, body, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <AdminNav current="/admin/announcements" />
      <h2 className="mt-10 text-3xl font-black tracking-tight">Announcements</h2>
      <AnnouncementManager items={data ?? []} />
    </main>
  );
}
