import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import RealtimeRefresh from "@/components/RealtimeRefresh";

type Row = {
  id: string;
  lesson_id: string;
  parent_id: string | null;
  author_name: string;
  is_staff: boolean;
  body: string;
  created_at: string;
  lessons: { title: string } | { title: string }[] | null;
};

export default async function AdminQuestionsPage() {
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
    .from("lesson_comments")
    .select("id, lesson_id, parent_id, author_name, is_staff, body, created_at, lessons(title)")
    .order("created_at", { ascending: false })
    .limit(300);

  const rows = (data ?? []) as unknown as Row[];
  const replies = rows.filter((r) => r.parent_id);
  const questions = rows
    .filter((r) => !r.parent_id && !r.is_staff)
    .map((q) => {
      const mine = replies.filter((r) => r.parent_id === q.id);
      const lesson = Array.isArray(q.lessons) ? q.lessons[0] : q.lessons;
      return {
        ...q,
        lessonTitle: lesson?.title ?? "Lesson",
        replyCount: mine.length,
        answered: mine.some((r) => r.is_staff),
      };
    });

  const unanswered = questions.filter((q) => !q.answered);
  const answered = questions.filter((q) => q.answered);

  const list = (items: typeof questions, empty: string) => (
    <ul className="mt-4 space-y-3">
      {items.length === 0 && (
        <li className="rounded-card border border-line bg-surface p-6 text-sm text-muted">{empty}</li>
      )}
      {items.map((q) => (
        <li key={q.id} className="rounded-card border border-line bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-muted">
              <span className="font-semibold text-white">{q.author_name}</span> &middot; {q.lessonTitle}
            </p>
            <Link
              href={`/dashboard?lesson=${q.lesson_id}`}
              className="text-xs font-semibold text-accent hover:underline"
            >
              Open lesson to reply
            </Link>
          </div>
          <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-white/80">{q.body}</p>
          <p className="mt-3 text-[11px] text-muted">
            {q.replyCount} {q.replyCount === 1 ? "reply" : "replies"}
          </p>
        </li>
      ))}
    </ul>
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <RealtimeRefresh table="lesson_comments" />
      <AdminNav current="/admin/questions" />

      <h2 className="mt-10 text-3xl font-black tracking-tight">Questions</h2>
      <p className="mt-2 text-sm text-muted">
        Student questions from under the lessons. Unanswered ones come first.
      </p>

      <h3 className="mt-8 text-xs font-extrabold tracking-widest uppercase">
        Unanswered ({unanswered.length})
      </h3>
      {list(unanswered, "All caught up. No unanswered questions.")}

      <h3 className="mt-10 text-xs font-extrabold tracking-widest uppercase">
        Answered ({answered.length})
      </h3>
      {list(answered, "Nothing answered yet.")}
    </main>
  );
}
