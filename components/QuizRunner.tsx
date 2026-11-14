"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type QuizData = {
  quiz_id: string;
  pass_mark: number;
  passed: boolean;
  best_score: number | null;
  questions: { id: string; prompt: string; options: string[] }[];
};

type Result = { score: number; passed: boolean; pass_mark: number; correct: number; total: number; wrong: string[] };

export default function QuizRunner({
  moduleId,
  quiz,
  continueHref,
  isAdmin,
}: {
  moduleId: string;
  quiz: QuizData;
  continueHref: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const answered = quiz.questions.filter((q) => answers[q.id] !== undefined).length;
  const wrong = new Set(result?.wrong ?? []);

  async function submit() {
    setBusy(true);
    setError("");
    const { data, error } = await createClient().rpc("submit_quiz", {
      p_module: moduleId,
      p_answers: answers,
    });
    setBusy(false);
    if (error) return setError(error.message);
    setResult(data as Result);
    window.scrollTo({ top: 0, behavior: "smooth" });
    router.refresh(); // unlock state in the sidebar
  }

  function retry() {
    setResult(null);
    setAnswers({});
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div>
      {quiz.passed && !result && (
        <p className="mt-6 rounded-card border border-accent bg-surface p-4 text-sm text-accent">
          You already passed this quiz (best score {quiz.best_score}%). You can take it again for practice.
        </p>
      )}

      {result && (
        <div
          className={`mt-6 rounded-card border bg-surface p-6 ${result.passed ? "border-accent" : "border-danger"}`}
          role="status"
        >
          <p className={`text-[10px] font-extrabold tracking-widest uppercase ${result.passed ? "text-accent" : "text-danger"}`}>
            {result.passed ? "Passed" : "Not passed yet"}
          </p>
          <p className="mt-2 text-4xl font-black">{result.score}%</p>
          <p className="mt-1 text-sm text-muted">
            {result.correct} of {result.total} correct. Pass mark is {result.pass_mark}%.
            {isAdmin && " (Admin test run, not recorded.)"}
          </p>
          {result.passed ? (
            <Link
              href={continueHref}
              className="mt-5 inline-block rounded-control bg-accent px-6 py-3 text-xs font-extrabold tracking-wider text-black uppercase"
            >
              Continue
            </Link>
          ) : (
            <>
              <p className="mt-4 text-sm text-muted">
                The questions you missed are marked below. Review the lessons and try again.
              </p>
              <button
                onClick={retry}
                className="mt-4 rounded-control border border-line px-6 py-3 text-xs font-extrabold tracking-wider uppercase hover:border-accent"
              >
                Try again
              </button>
            </>
          )}
        </div>
      )}

      <ol className="mt-8 space-y-6">
        {quiz.questions.map((q, i) => (
          <li
            key={q.id}
            className={`rounded-card border bg-surface p-5 ${result && wrong.has(q.id) ? "border-danger" : "border-line"}`}
          >
            <p className="text-sm font-semibold">
              {i + 1}. {q.prompt}
              {result && wrong.has(q.id) && (
                <span className="ml-3 text-[10px] font-extrabold tracking-widest text-danger uppercase">Missed</span>
              )}
            </p>
            <div className="mt-3 space-y-2">
              {q.options.map((o, idx) => (
                <label
                  key={idx}
                  className={`flex cursor-pointer items-center gap-3 rounded-control border px-4 py-3 text-sm ${
                    answers[q.id] === idx ? "border-accent" : "border-line"
                  } ${result ? "pointer-events-none" : "hover:border-accent/60"}`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id] === idx}
                    disabled={!!result}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: idx }))}
                    className="accent-[#6c579e]"
                  />
                  {o}
                </label>
              ))}
            </div>
          </li>
        ))}
      </ol>

      {error && <p className="mt-4 break-words text-sm text-danger">{error}</p>}

      {!result && (
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            onClick={submit}
            disabled={busy || answered === 0}
            className="rounded-control bg-accent px-8 py-3.5 text-xs font-extrabold tracking-wider text-black uppercase disabled:opacity-50"
          >
            {busy ? "Marking…" : "Submit answers"}
          </button>
          <span className="text-xs text-muted">
            {answered} of {quiz.questions.length} answered. Pass mark: {quiz.pass_mark}%.
          </span>
        </div>
      )}
    </div>
  );
}
