"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { inputCls, labelCls } from "@/components/ui";

export type AdminModule = { id: string; position: number; title: string };
export type AdminQuiz = { id: string; module_id: string; pass_mark: number };
export type AdminQuestion = {
  id: string;
  quiz_id: string;
  position: number;
  prompt: string;
  options: string[];
  correct_index: number;
};

const blank = { prompt: "", options: ["", "", "", ""], correct: 0 };

export default function QuizManager({
  modules,
  quizzes,
  questions,
}: {
  modules: AdminModule[];
  quizzes: AdminQuiz[];
  questions: AdminQuestion[];
}) {
  const router = useRouter();
  const [moduleId, setModuleId] = useState(modules[0]?.id ?? "");
  const [passMark, setPassMark] = useState<string | null>(null);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const mod = modules.find((m) => m.id === moduleId);
  const quiz = quizzes.find((q) => q.module_id === moduleId);
  const qs = quiz ? questions.filter((q) => q.quiz_id === quiz.id).sort((a, b) => a.position - b.position) : [];
  const countFor = (id: string) => {
    const q = quizzes.find((x) => x.module_id === id);
    return q ? questions.filter((x) => x.quiz_id === q.id).length : 0;
  };

  function pick(id: string) {
    setModuleId(id);
    setPassMark(null);
    setForm(blank);
    setEditing(null);
    setError("");
  }

  async function ensureQuiz(): Promise<string | null> {
    if (quiz) return quiz.id;
    const mark = Math.min(100, Math.max(1, Number(passMark ?? 70) || 70));
    const { data, error } = await createClient()
      .from("quizzes")
      .insert({ module_id: moduleId, pass_mark: mark })
      .select("id")
      .single();
    if (error) {
      setError(error.message);
      return null;
    }
    return data.id;
  }

  async function savePassMark() {
    setError("");
    const mark = Number(passMark);
    if (!Number.isInteger(mark) || mark < 1 || mark > 100) return setError("Pass mark must be a whole number from 1 to 100.");
    setBusy(true);
    const id = await ensureQuiz();
    if (id && quiz) {
      const { error } = await createClient().from("quizzes").update({ pass_mark: mark }).eq("id", id);
      if (error) setError(error.message);
    }
    setBusy(false);
    setPassMark(null);
    router.refresh();
  }

  async function saveQuestion(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const options = form.options.map((o) => o.trim());
    const filled = options.filter(Boolean);
    if (!form.prompt.trim()) return setError("Please type the question.");
    if (filled.length < 2) return setError("Give at least two answer choices.");
    // Keep the order, drop empty boxes, and move the "correct" pointer with its text.
    const correctText = options[form.correct];
    if (!correctText) return setError("The answer marked correct is empty. Pick a filled one.");
    const finalOptions = options.filter(Boolean);
    const correctIndex = finalOptions.indexOf(correctText);

    setBusy(true);
    const supabase = createClient();
    if (editing) {
      const { error } = await supabase
        .from("quiz_questions")
        .update({ prompt: form.prompt.trim(), options: finalOptions, correct_index: correctIndex })
        .eq("id", editing);
      setBusy(false);
      if (error) return setError(error.message);
    } else {
      const quizId = await ensureQuiz();
      if (!quizId) return setBusy(false);
      const { error } = await supabase.from("quiz_questions").insert({
        quiz_id: quizId,
        position: qs.length + 1,
        prompt: form.prompt.trim(),
        options: finalOptions,
        correct_index: correctIndex,
      });
      setBusy(false);
      if (error) return setError(error.message);
    }
    setForm(blank);
    setEditing(null);
    router.refresh();
  }

  function edit(q: AdminQuestion) {
    setEditing(q.id);
    const opts = [...q.options, "", "", "", ""].slice(0, Math.max(4, q.options.length));
    setForm({ prompt: q.prompt, options: opts, correct: q.correct_index });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(q: AdminQuestion) {
    if (!window.confirm("Delete this question?")) return;
    const { error } = await createClient().from("quiz_questions").delete().eq("id", q.id);
    if (error) setError(error.message);
    router.refresh();
  }

  async function removeQuiz() {
    if (!quiz || !window.confirm(`Delete the whole quiz for "${mod?.title}"? Students will no longer need to pass it.`)) return;
    const { error } = await createClient().from("quizzes").delete().eq("id", quiz.id);
    if (error) setError(error.message);
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-8">
      <div className="flex flex-wrap gap-3">
        {modules.map((m) => (
          <button
            key={m.id}
            onClick={() => pick(m.id)}
            className={`rounded-control border px-4 py-2 text-xs font-semibold tracking-wider uppercase ${
              moduleId === m.id ? "border-accent text-white" : "border-line text-muted"
            }`}
          >
            M{m.position} · {m.title}
            {countFor(m.id) > 0 && <span className="ml-2 text-accent">({countFor(m.id)})</span>}
          </button>
        ))}
      </div>

      {mod && (
        <>
          <div className="rounded-card border border-line bg-surface p-5">
            <h3 className="text-xs font-extrabold tracking-widest uppercase">
              Module {mod.position} quiz {quiz ? "" : "(none yet)"}
            </h3>
            <p className="mt-2 text-xs text-muted">
              With at least one question, students must pass this quiz before the next module opens.
              Students never see the correct answers, only which questions they missed.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="text-xs text-muted" htmlFor="pm">Pass mark (%)</label>
              <input
                id="pm"
                type="number"
                min={1}
                max={100}
                className="w-24 rounded-control border border-line bg-black px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
                value={passMark ?? String(quiz?.pass_mark ?? 70)}
                onChange={(e) => setPassMark(e.target.value)}
              />
              {quiz && passMark !== null && String(quiz.pass_mark) !== passMark && (
                <button onClick={savePassMark} disabled={busy} className="rounded-control bg-accent px-4 py-2 text-xs font-extrabold tracking-wider text-black uppercase">
                  Save
                </button>
              )}
              {quiz && (
                <button onClick={removeQuiz} className="ml-auto text-xs text-muted hover:text-danger">
                  Delete whole quiz
                </button>
              )}
            </div>
          </div>

          <form onSubmit={saveQuestion} className="space-y-5 rounded-card border border-line bg-surface p-6">
            <h3 className="text-xs font-extrabold tracking-widest uppercase">
              {editing ? "Edit question" : "Add a question"}
            </h3>
            <div>
              <label className={labelCls} htmlFor="q_prompt">Question</label>
              <textarea id="q_prompt" rows={2} maxLength={500} className={inputCls} value={form.prompt}
                onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))} />
            </div>
            <div className="space-y-3">
              <span className={labelCls}>Answer choices (tick the correct one)</span>
              {form.options.map((o, i) => (
                <div key={i} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="correct"
                    aria-label={`Choice ${i + 1} is correct`}
                    checked={form.correct === i}
                    onChange={() => setForm((f) => ({ ...f, correct: i }))}
                    className="accent-[#6c579e]"
                  />
                  <input
                    className={inputCls}
                    maxLength={200}
                    placeholder={`Choice ${i + 1}${i >= 2 ? " (optional)" : ""}`}
                    value={o}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, options: f.options.map((x, j) => (j === i ? e.target.value : x)) }))
                    }
                  />
                </div>
              ))}
              {form.options.length < 5 && (
                <button type="button" onClick={() => setForm((f) => ({ ...f, options: [...f.options, ""] }))}
                  className="text-xs text-accent hover:underline">
                  + Add a fifth choice
                </button>
              )}
            </div>
            {error && <p className="break-words text-sm text-danger">{error}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={busy} className="rounded-control bg-accent px-6 py-3 text-xs font-extrabold tracking-wider text-black uppercase disabled:opacity-50">
                {editing ? "Save question" : "Add question"}
              </button>
              {editing && (
                <button type="button" onClick={() => { setEditing(null); setForm(blank); setError(""); }}
                  className="rounded-control border border-line px-6 py-3 text-xs font-semibold tracking-wider text-muted uppercase">
                  Cancel
                </button>
              )}
            </div>
          </form>

          <ol className="space-y-3">
            {qs.length === 0 && <li className="text-sm text-muted">No questions yet for this module.</li>}
            {qs.map((q, i) => (
              <li key={q.id} className="rounded-card border border-line bg-surface p-4">
                <p className="text-sm font-semibold">{i + 1}. {q.prompt}</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {q.options.map((o, j) => (
                    <li key={j} className={j === q.correct_index ? "text-accent" : "text-muted"}>
                      {j === q.correct_index ? "✓ " : "· "}{o}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => edit(q)} className="rounded-control border border-line px-3 py-1.5 text-xs font-semibold tracking-wider text-white uppercase hover:border-accent">Edit</button>
                  <button onClick={() => remove(q)} className="rounded-control border border-line px-3 py-1.5 text-xs font-semibold tracking-wider text-muted uppercase hover:border-danger hover:text-danger">Delete</button>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
