import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import AdminStudents from "@/components/AdminStudents";
import RealtimeRefresh from "@/components/RealtimeRefresh";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  // Real protection is the database policy; this just sends non-admins away.
  if (me?.role !== "admin") redirect("/dashboard");

  const { data: students } = await supabase
    .from("profiles")
    .select("id, full_name, email, whatsapp, learning_mode, payment_status, created_at")
    .eq("role", "student")
    .order("created_at", { ascending: false });

  const { data: doneRows } = await supabase
    .from("lesson_progress")
    .select("user_id")
    .eq("completed", true);
  const completed: Record<string, number> = {};
  (doneRows ?? []).forEach((r) => {
    completed[r.user_id] = (completed[r.user_id] ?? 0) + 1;
  });
  const { count: totalLessons } = await supabase
    .from("lessons")
    .select("id", { count: "exact", head: true });

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <RealtimeRefresh />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-accent">ADMIN</h1>
        <div className="flex items-center gap-5">
          <Link href="/admin/courses" className="text-xs text-accent hover:underline">
            Manage courses
          </Link>
          <Link href="/dashboard" className="text-xs text-muted hover:text-white">
            View student area
          </Link>
          <SignOutButton />
        </div>
      </div>

      <h2 className="mt-10 text-3xl font-black tracking-tight">Students</h2>
      <AdminStudents students={students ?? []} completed={completed} totalLessons={totalLessons ?? 0} />
    </main>
  );
}
