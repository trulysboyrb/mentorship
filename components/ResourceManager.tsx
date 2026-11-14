"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { inputCls, labelCls } from "@/components/ui";

export type AdminResource = {
  id: string;
  title: string;
  body: string | null;
  lesson_id: string | null;
  lesson_title: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
};
export type LessonOption = { id: string; label: string };

const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPT = ".pdf,.doc,.docx,.pptx,.xlsx,.txt,.png,.jpg,.jpeg";

function sizeText(n: number | null) {
  if (!n) return "";
  return n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

export default function ResourceManager({
  items,
  lessons,
}: {
  items: AdminResource[];
  lessons: LessonOption[];
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim()) return setError("Please give it a title.");
    if (!file && !body.trim()) return setError("Add a file, or type a note, or both.");
    if (file && file.size > MAX_BYTES) return setError("That file is bigger than 25 MB. Please compress it first.");

    setBusy(true);
    const supabase = createClient();
    let path: string | null = null;

    if (file) {
      const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-100);
      path = `${crypto.randomUUID()}/${safe}`;
      const { error: upErr } = await supabase.storage.from("resources").upload(path, file, {
        contentType: file.type || undefined,
      });
      if (upErr) {
        setBusy(false);
        return setError(`Upload failed: ${upErr.message}`);
      }
    }

    const { error: dbErr } = await supabase.from("resources").insert({
      title: title.trim(),
      body: body.trim() || null,
      lesson_id: lessonId || null,
      file_path: path,
      file_name: file?.name ?? null,
      file_size: file?.size ?? null,
    });
    if (dbErr) {
      if (path) await supabase.storage.from("resources").remove([path]);
      setBusy(false);
      return setError(dbErr.message);
    }

    setBusy(false);
    setTitle("");
    setBody("");
    setLessonId("");
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
    router.refresh();
  }

  async function remove(r: AdminResource) {
    if (!window.confirm(`Delete "${r.title}"? Students will no longer see or download it.`)) return;
    setError("");
    const supabase = createClient();
    const { error } = await supabase.from("resources").delete().eq("id", r.id);
    if (error) return setError(error.message);
    if (r.file_path) await supabase.storage.from("resources").remove([r.file_path]);
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-10">
      <form onSubmit={add} className="space-y-5 rounded-card border border-line bg-surface p-6">
        <h3 className="text-xs font-extrabold tracking-widest uppercase">Upload a note or file</h3>
        <p className="text-xs text-muted">
          Shows up in every paid student&apos;s Profile under <strong>Notes</strong>, with a Download button.
          Pick a lesson to show it under that lesson too.
        </p>
        <div>
          <label className={labelCls} htmlFor="r_title">Title</label>
          <input id="r_title" maxLength={120} className={inputCls} placeholder="e.g. Speech outline template"
            value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="r_file">File (PDF, Word, PowerPoint, Excel, text or image, up to 25 MB)</label>
          <input
            id="r_file"
            ref={fileInput}
            type="file"
            accept={ACCEPT}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-muted file:mr-4 file:rounded-control file:border file:border-line file:bg-black file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white file:uppercase"
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="r_body">Note text (optional)</label>
          <textarea id="r_body" rows={4} maxLength={5000} className={inputCls} value={body}
            onChange={(e) => setBody(e.target.value)} placeholder="Type a note students will read in their Profile" />
        </div>
        <div>
          <label className={labelCls} htmlFor="r_lesson">Attach to a lesson (optional)</label>
          <select id="r_lesson" className={inputCls} value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
            <option value="">General: for all paid students</option>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
          <p className="mt-2 text-xs text-muted">A lesson file stays hidden until the student unlocks that lesson.</p>
        </div>
        {error && <p className="break-words text-sm text-danger">{error}</p>}
        <button type="submit" disabled={busy}
          className="rounded-control bg-accent px-6 py-3 text-xs font-extrabold tracking-wider text-black uppercase disabled:opacity-50">
          {busy ? "Uploading…" : "Upload"}
        </button>
      </form>

      <div>
        <h3 className="text-xs font-extrabold tracking-widest uppercase">Uploaded ({items.length})</h3>
        <ul className="mt-4 space-y-3">
          {items.length === 0 && <li className="text-sm text-muted">Nothing uploaded yet.</li>}
          {items.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface p-4">
              <div className="min-w-0">
                <p className="font-semibold">{r.title}</p>
                <p className="mt-1 text-xs text-muted" suppressHydrationWarning>
                  {r.lesson_title ? `Lesson: ${r.lesson_title}` : "General"}
                  {r.file_name ? ` · ${r.file_name}${r.file_size ? ` (${sizeText(r.file_size)})` : ""}` : " · note only"}
                  {" · "}
                  {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <button onClick={() => remove(r)}
                className="rounded-control border border-line px-3 py-1.5 text-xs font-semibold tracking-wider text-muted uppercase hover:border-danger hover:text-danger">
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
