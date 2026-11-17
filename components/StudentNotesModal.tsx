"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { inputCls } from "@/components/ui";

export type NoteItem = {
  id: string;
  body: string;
  author_name: string;
  created_at: string;
};

const smallBtn =
  "rounded-control border border-line px-3 py-1.5 text-xs font-semibold tracking-wider text-muted uppercase hover:border-accent hover:text-white disabled:opacity-40";

export default function StudentNotesModal({
  student,
  notes,
  onClose,
}: {
  student: { id: string; full_name: string };
  notes: NoteItem[];
  onClose: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    const { error } = await supabase.rpc("add_student_note", {
      p_student: student.id,
      p_body: text,
    });
    setBusy(false);
    if (error) return setError(error.message);
    setText("");
    router.refresh();
  }

  async function remove(n: NoteItem) {
    if (!window.confirm("Delete this note?")) return;
    setError("");
    const { error } = await supabase.from("student_notes").delete().eq("id", n.id);
    if (error) setError(error.message);
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card border border-line bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black tracking-tight">Private notes</h3>
            <p className="mt-1 text-sm text-muted">{student.full_name}</p>
            <p className="mt-1 text-xs text-muted">Only admins can see these. Students never can.</p>
          </div>
          <button onClick={onClose} className={smallBtn}>Close</button>
        </div>

        <form onSubmit={add} className="mt-6 space-y-3">
          <textarea
            rows={3}
            maxLength={2000}
            className={inputCls}
            placeholder="e.g. Paid half, rest due Friday"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {error && <p className="break-words text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={busy || !text.trim()}
            className="rounded-control bg-accent px-5 py-2.5 text-xs font-extrabold tracking-wider text-black uppercase disabled:opacity-50"
          >
            Add note
          </button>
        </form>

        <ul className="mt-6 space-y-3 border-t border-line pt-6">
          {notes.length === 0 && <li className="text-sm text-muted">No notes yet.</li>}
          {notes.map((n) => (
            <li key={n.id} className="rounded-control border border-line bg-surface-2 p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{n.body}</p>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted">
                <span suppressHydrationWarning>
                  {n.author_name || "Admin"} &middot;{" "}
                  {new Date(n.created_at).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <button
                  onClick={() => remove(n)}
                  className="hover:text-danger"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
