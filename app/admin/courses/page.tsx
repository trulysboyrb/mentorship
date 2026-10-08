import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import CourseManager from "@/components/CourseManager";

type Content = {
  notes: string | null;
  video_path: string | null;
  video_url: string | null;
};
type RawLesson = {
  id: string;
  position: number;
  title: string;
  lesson_content: Content | Content[] | null;
};
type RawModule = {
  id: string;
  position: number;
  title: string;
  lessons: RawLesson[];
};

export default async function AdminCoursesPage() {
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
    .from("modules")
    .select(
      "id, position, title, lessons(id, position, title, lesson_content(notes, video_path, video_url))"
    )
    .order("position")
    .order("position", { referencedTable: "lessons" });

  const modules = ((data ?? []) as unknown as RawModule[]).map((m) => ({
    id: m.id,
    position: m.position,
    title: m.title,
    lessons: m.lessons.map((l) => {
      const c = Array.isArray(l.lesson_content)
        ? l.lesson_content[0]
        : l.lesson_content;
      return { id: l.id, position: l.position, title: l.title, content: c ?? null };
    }),
  }));

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-accent">ADMIN</h1>
        <div className="flex items-center gap-5">
          <Link href="/admin" className="text-xs text-muted hover:text-white">
            Students
          </Link>
          <SignOutButton />
        </div>
      </div>

      <h2 className="mt-10 text-3xl font-black tracking-tight">Courses</h2>
      <CourseManager modules={modules} />
    </main>
  );
}
