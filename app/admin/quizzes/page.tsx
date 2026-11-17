import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import QuizManager, { type AdminModule, type AdminQuestion, type AdminQuiz } from "@/components/QuizManager";

export default async function AdminQuizzesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (me?.role !== "admin") redirect("/dashboard");

  const [{ data: modules }, { data: quizzes, error }, { data: questions }] = await Promise.all([
    supabase.from("modules").select("id, position, title").order("position"),
    supabase.from("quizzes").select("id, module_id, pass_mark"),
    supabase
      .from("quiz_questions")
      .select("id, quiz_id, position, prompt, options, correct_index")
      .order("position"),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <AdminNav current="/admin/quizzes" />
      <h2 className="mt-10 text-3xl font-black tracking-tight">Quizzes</h2>
      {error ? (
        <p className="mt-6 break-words text-sm text-danger">
          Could not load quizzes: {error.message}. Did you run the Phase 9 SQL?
        </p>
      ) : (
        <QuizManager
          modules={(modules ?? []) as AdminModule[]}
          quizzes={(quizzes ?? []) as AdminQuiz[]}
          questions={(questions ?? []) as AdminQuestion[]}
        />
      )}
    </main>
  );
}
