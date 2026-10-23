import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
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

  const [
    { data: students, error: studentsError },
    { data: stats },
    { data: certRows },
    { data: noteRows },
    { count: totalLessons },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, whatsapp, learning_mode, payment_status, created_at, referral_discount, referred_by")
      .eq("role", "student")
      .order("created_at", { ascending: false }),
    supabase.rpc("admin_student_stats"),
    supabase
      .from("certificates")
      .select("id, user_id, title, file_path")
      .order("issued_at", { ascending: false }),
    supabase
      .from("student_notes")
      .select("id, student_id, body, author_name, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("lessons").select("id", { count: "exact", head: true }),
  ]);

  const completed: Record<string, number> = {};
  const finished: Record<string, boolean> = {};
  (
    (stats ?? []) as {
      user_id: string;
      completed_count: number;
      required_done: number;
      required_total: number;
    }[]
  ).forEach((r) => {
    completed[r.user_id] = r.completed_count;
    finished[r.user_id] = r.required_total > 0 && r.required_done >= r.required_total;
  });

  const certificates: Record<string, { id: string; title: string; file_path: string }[]> = {};
  (certRows ?? []).forEach((c) => {
    (certificates[c.user_id] ??= []).push({ id: c.id, title: c.title, file_path: c.file_path });
  });

  const notes: Record<
    string,
    { id: string; body: string; author_name: string; created_at: string }[]
  > = {};
  (noteRows ?? []).forEach((n) => {
    (notes[n.student_id] ??= []).push({
      id: n.id,
      body: n.body,
      author_name: n.author_name,
      created_at: n.created_at,
    });
  });

  const nameById: Record<string, string> = {};
  (students ?? []).forEach((s) => (nameById[s.id] = s.full_name));
  const rows = (students ?? []).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    email: s.email,
    whatsapp: s.whatsapp,
    learning_mode: s.learning_mode,
    payment_status: s.payment_status,
    created_at: s.created_at,
    referral_discount: !!s.referral_discount,
    // Referrers are always students or admin; admins are not in this list, so fall back to null.
    referrer_name: s.referred_by ? (nameById[s.referred_by] ?? null) : null,
  }));

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <RealtimeRefresh />
      <RealtimeRefresh table="lesson_progress" filter="completed=eq.true" />
      <AdminNav current="/admin" />

      <h2 className="mt-10 text-3xl font-black tracking-tight">Students</h2>
      {studentsError && (
        <div className="mt-6 rounded-card border border-danger bg-surface p-5 text-sm">
          <p className="font-extrabold text-danger">The students list could not be loaded.</p>
          <p className="mt-2 break-words text-muted">{studentsError.message}</p>
          <p className="mt-2 text-muted">
            Your students are safe in the database. This usually means a SQL file from the latest
            update has not been run yet in Supabase (SQL Editor).
          </p>
        </div>
      )}
      <AdminStudents
        students={rows}
        completed={completed}
        totalLessons={totalLessons ?? 0}
        finished={finished}
        certificates={certificates}
        notes={notes}
      />
    </main>
  );
}
