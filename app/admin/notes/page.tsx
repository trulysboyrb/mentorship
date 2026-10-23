import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import ResourceManager, { type AdminResource, type LessonOption } from "@/components/ResourceManager";

export default async function AdminNotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (me?.role !== "admin") redirect("/dashboard");

  const [{ data: rows, error }, { data: modules }] = await Promise.all([
    supabase
      .from("resources")
      .select("id, title, body, lesson_id, file_path, file_name, file_size, created_at, lessons(title)")
      .order("created_at", { ascending: false }),
    supabase
      .from("modules")
      .select("position, title, lessons(id, position, title)")
      .order("position")
      .order("position", { referencedTable: "lessons" }),
  ]);

  const items: AdminResource[] = ((rows ?? []) as unknown as (Omit<AdminResource, "lesson_title"> & {
    lessons: { title: string } | { title: string }[] | null;
  })[]).map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    lesson_id: r.lesson_id,
    lesson_title: Array.isArray(r.lessons) ? (r.lessons[0]?.title ?? null) : (r.lessons?.title ?? null),
    file_path: r.file_path,
    file_name: r.file_name,
    file_size: r.file_size,
    created_at: r.created_at,
  }));

  const lessons: LessonOption[] = (modules ?? []).flatMap((m) =>
    m.lessons.map((l) => ({ id: l.id, label: `Module ${m.position} · ${l.title}` }))
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <AdminNav current="/admin/notes" />
      <h2 className="mt-10 text-3xl font-black tracking-tight">Notes and downloads</h2>
      {error ? (
        <p className="mt-6 break-words text-sm text-danger">
          Could not load: {error.message}. Did you run the Phase 9 SQL?
        </p>
      ) : (
        <ResourceManager items={items} lessons={lessons} />
      )}
    </main>
  );
}
