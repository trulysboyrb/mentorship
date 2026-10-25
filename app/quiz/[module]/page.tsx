import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkDevice } from "@/lib/device";
import TopBar from "@/components/TopBar";
import { avatarUrl } from "@/lib/avatar";
import QuizRunner, { type QuizData } from "@/components/QuizRunner";

export default async function QuizPage({ params }: { params: Promise<{ module: string }> }) {
  const { module: moduleId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, payment_status, avatar_path")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/dashboard");

  const isAdmin = profile.role === "admin";
  if (profile.payment_status !== "cleared" && !isAdmin) redirect("/dashboard");
  if (!isAdmin && (await checkDevice(supabase)) === "limit") redirect("/device-limit");

  // A module id that is not a UUID would make the database complain, so check it first.
  const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(moduleId);

  const [{ data: modules }, quizRes] = await Promise.all([
    supabase
      .from("modules")
      .select("id, position, title, lessons(id, position)")
      .order("position")
      .order("position", { referencedTable: "lessons" }),
    validId ? supabase.rpc("get_quiz", { p_module: moduleId }) : Promise.resolve({ data: null, error: null }),
  ]);

  const list = modules ?? [];
  const idx = list.findIndex((m) => m.id === moduleId);
  const mod = idx >= 0 ? list[idx] : null;
  const nextFirst = idx >= 0 ? list[idx + 1]?.lessons?.[0]?.id : undefined;
  const continueHref = nextFirst ? `/dashboard?lesson=${nextFirst}` : "/dashboard";
  const quiz = quizRes.data as QuizData | null;

  return (
    <>
      <TopBar
        fullName={profile.full_name}
        avatarUrl={avatarUrl(profile.avatar_path)}
        isAdmin={isAdmin}
        showTools
        left={
          <Link href="/dashboard" className="text-muted hover:text-white">
            Back to courses
          </Link>
        }
      />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-[10px] font-extrabold tracking-widest text-muted uppercase">
          Module {mod?.position ?? ""} quiz
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">{mod?.title ?? "Quiz"}</h1>

        {quizRes.error ? (
          <p className="mt-6 break-words text-sm text-danger">
            Could not load the quiz: {quizRes.error.message}. Did you run the Phase 9 SQL?
          </p>
        ) : !quiz ? (
          <div className="mt-6 rounded-card border border-line bg-surface p-6 text-sm text-muted">
            This quiz is not open yet. Finish every lesson in this module first, then come back.
            <Link href="/dashboard" className="mt-4 block text-accent hover:underline">
              Back to my lessons
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted">
              Answer the questions below. You need {quiz.pass_mark}% to pass and unlock the next module.
            </p>
            <QuizRunner moduleId={moduleId} quiz={quiz} continueHref={continueHref} isAdmin={isAdmin} />
          </>
        )}
      </main>
    </>
  );
}
