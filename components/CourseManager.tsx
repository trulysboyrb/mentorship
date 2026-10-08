"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { inputCls } from "@/components/ui";

const BUCKET = "course-videos";
const MAX_MB = 50; // Supabase free plan limit per file

type Content = {
  notes: string | null;
  video_path: string | null;
  video_url: string | null;
} | null;
type Lesson = { id: string; position: number; title: string; content: Content };
type Module = { id: string; position: number; title: string; lessons: Lesson[] };

// Reads the video length in the browser so the server knows how long each lesson is.
function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(file);
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(v.duration) ? v.duration : null);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    v.src = url;
  });
}

const smallBtn =
  "rounded-control border border-line px-3 py-1.5 text-xs font-semibold tracking-wider text-muted uppercase hover:border-accent hover:text-white disabled:opacity-40";

export default function CourseManager({ modules }: { modules: Module[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [error, setError] = useState("");
  const [openLesson, setOpenLesson] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ id: string; pct: number } | null>(null);
  const [newModule, setNewModule] = useState("");
  const [newLesson, setNewLesson] = useState<Record<string, string>>({});

  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>) {
    setError("");
    const { error } = await fn();
    if (error) setError(error.message);
    router.refresh();
  }

  // ----- modules -----
  async function addModule() {
    const title = newModule.trim();
    if (!title) return;
    const position = (modules[modules.length - 1]?.position ?? 0) + 1;
    await run(() => supabase.from("modules").insert({ position, title }));
    setNewModule("");
  }

  async function deleteModule(m: Module) {
    if (!window.confirm(`Delete module "${m.title}" and ALL its lessons and videos?`)) return;
    const paths = m.lessons.map((l) => l.content?.video_path).filter(Boolean) as string[];
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    await run(() => supabase.from("modules").delete().eq("id", m.id));
  }

  // ----- lessons -----
  async function addLesson(m: Module) {
    const title = (newLesson[m.id] ?? "").trim();
    if (!title) return;
    const position = (m.lessons[m.lessons.length - 1]?.position ?? 0) + 1;
    await run(() =>
      supabase.from("lessons").insert({ module_id: m.id, position, title })
    );
    setNewLesson((n) => ({ ...n, [m.id]: "" }));
  }

  async function deleteLesson(l: Lesson) {
    if (!window.confirm(`Delete lesson "${l.title}"?`)) return;
    if (l.content?.video_path)
      await supabase.storage.from(BUCKET).remove([l.content.video_path]);
    await run(() => supabase.from("lessons").delete().eq("id", l.id));
  }

  async function saveNotes(l: Lesson, notes: string) {
    await run(() => supabase.from("lesson_content").upsert({ lesson_id: l.id, notes }));
  }

  // ----- video upload (direct to private storage, with a progress bar) -----
  async function upload(l: Lesson, file: File) {
    setError("");
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`That file is ${(file.size / 1024 / 1024).toFixed(0)} MB. The limit is ${MAX_MB} MB on the free plan. Compress it or split it into shorter parts.`);
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setError("Please log in again.");
      return;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${l.id}/${Date.now()}-${safeName}`;
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${BUCKET}/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;

    const duration = await readDuration(file);
    setProgress({ id: l.id, pct: 0 });

    const failure = await new Promise<string | null>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
      xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      xhr.setRequestHeader("x-upsert", "true");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable)
          setProgress({ id: l.id, pct: Math.round((e.loaded / e.total) * 100) });
      };
      xhr.onload = () =>
        resolve(
          xhr.status >= 200 && xhr.status < 300
            ? null
            : `Upload failed (${xhr.status}): ${xhr.responseText}`
        );
      xhr.onerror = () => resolve("Network error during upload. Check your connection and try again.");
      const form = new FormData();
      form.append("cacheControl", "3600");
      form.append("", file);
      xhr.send(form);
    });

    if (failure) {
      setError(failure);
      setProgress(null);
      return;
    }

    const old = l.content?.video_path;
    await run(() =>
      supabase
        .from("lesson_content")
        .upsert({ lesson_id: l.id, video_path: path, video_url: null, duration_seconds: duration })
    );
    if (old) await supabase.storage.from(BUCKET).remove([old]);
    setProgress(null);
  }

  async function removeVideo(l: Lesson) {
    if (!window.confirm("Remove this video?")) return;
    if (l.content?.video_path)
      await supabase.storage.from(BUCKET).remove([l.content.video_path]);
    await run(() =>
      supabase
        .from("lesson_content")
        .upsert({ lesson_id: l.id, video_path: null, video_url: null, duration_seconds: null })
    );
  }

  return (
    <div className="mt-6 space-y-8">
      {error && (
        <p className="break-words rounded-control border border-danger/40 p-3 text-sm text-danger">
          {error}
        </p>
      )}

      {modules.map((m, mi) => (
        <section key={m.id} className="rounded-card border border-line bg-surface p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-extrabold tracking-widest text-muted uppercase">
              Module {m.position}
            </span>
            <input
              key={`${m.id}-${m.title}`}
              defaultValue={m.title}
              className={`${inputCls} max-w-xs flex-1 !py-2`}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== m.title)
                  run(() => supabase.from("modules").update({ title: v }).eq("id", m.id));
              }}
            />
            <div className="ml-auto flex gap-2">
              <button className={smallBtn} disabled={mi === 0}
                onClick={() => run(() => supabase.rpc("move_module", { target: m.id, direction: -1 }))}>
                Up
              </button>
              <button className={smallBtn} disabled={mi === modules.length - 1}
                onClick={() => run(() => supabase.rpc("move_module", { target: m.id, direction: 1 }))}>
                Down
              </button>
              <button className={`${smallBtn} hover:!border-danger hover:!text-danger`}
                onClick={() => deleteModule(m)}>
                Delete
              </button>
            </div>
          </div>

          <ul className="mt-5 space-y-3">
            {m.lessons.map((l, li) => {
              const isOpen = openLesson === l.id;
              const hasVideo = !!(l.content?.video_path || l.content?.video_url);
              return (
                <li key={l.id} className="rounded-control border border-line bg-surface-2">
                  <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <button onClick={() => setOpenLesson(isOpen ? null : l.id)}
                      className="flex-1 text-left text-sm font-medium">
                      {l.title}
                      <span className={`ml-3 text-[10px] tracking-widest uppercase ${hasVideo ? "text-accent" : "text-muted"}`}>
                        {hasVideo ? "Video uploaded" : "No video"}
                      </span>
                    </button>
                    <button className={smallBtn} disabled={li === 0}
                      onClick={() => run(() => supabase.rpc("move_lesson", { target: l.id, direction: -1 }))}>
                      Up
                    </button>
                    <button className={smallBtn} disabled={li === m.lessons.length - 1}
                      onClick={() => run(() => supabase.rpc("move_lesson", { target: l.id, direction: 1 }))}>
                      Down
                    </button>
                  </div>

                  {isOpen && (
                    <div className="space-y-5 border-t border-line p-4">
                      <div>
                        <p className="mb-2 text-[10px] font-semibold tracking-widest text-muted uppercase">
                          Lesson title
                        </p>
                        <input
                          key={`${l.id}-${l.title}`}
                          defaultValue={l.title}
                          className={inputCls}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v && v !== l.title)
                              run(() => supabase.from("lessons").update({ title: v }).eq("id", l.id));
                          }}
                        />
                      </div>

                      <div>
                        <p className="mb-2 text-[10px] font-semibold tracking-widest text-muted uppercase">
                          Video (mp4 or webm, max {MAX_MB} MB)
                        </p>
                        <input
                          type="file"
                          accept="video/mp4,video/webm"
                          disabled={progress?.id === l.id}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) upload(l, f);
                            e.target.value = "";
                          }}
                          className="block w-full text-sm text-muted file:mr-4 file:rounded-control file:border file:border-line file:bg-black file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white file:uppercase"
                        />
                        {progress?.id === l.id && (
                          <div className="mt-3">
                            <div className="h-1 w-full bg-line">
                              <div className="h-1 bg-accent transition-all" style={{ width: `${progress.pct}%` }} />
                            </div>
                            <p className="mt-1 text-xs text-muted">Uploading... {progress.pct}%</p>
                          </div>
                        )}
                        {hasVideo && l.content?.video_path && (
                          <button className={`${smallBtn} mt-3`} onClick={() => removeVideo(l)}>
                            Remove video
                          </button>
                        )}
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const notes = new FormData(e.currentTarget).get("notes") as string;
                          saveNotes(l, notes);
                        }}
                      >
                        <p className="mb-2 text-[10px] font-semibold tracking-widest text-muted uppercase">
                          Lesson notes
                        </p>
                        <textarea
                          key={`${l.id}-${l.content?.notes}`}
                          name="notes"
                          rows={6}
                          defaultValue={l.content?.notes ?? ""}
                          className={inputCls}
                        />
                        <button type="submit" className={`${smallBtn} mt-3 !border-accent !text-accent`}>
                          Save notes
                        </button>
                      </form>

                      <button className={`${smallBtn} hover:!border-danger hover:!text-danger`}
                        onClick={() => deleteLesson(l)}>
                        Delete lesson
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex gap-3">
            <input
              placeholder="New lesson title"
              className={`${inputCls} !py-2`}
              value={newLesson[m.id] ?? ""}
              onChange={(e) => setNewLesson((n) => ({ ...n, [m.id]: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && addLesson(m)}
            />
            <button className={smallBtn} onClick={() => addLesson(m)}>Add lesson</button>
          </div>
        </section>
      ))}

      <div className="flex gap-3">
        <input
          placeholder="New module title"
          className={inputCls}
          value={newModule}
          onChange={(e) => setNewModule(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addModule()}
        />
        <button className={`${smallBtn} whitespace-nowrap !border-accent !text-accent`} onClick={addModule}>
          Add module
        </button>
      </div>
    </div>
  );
}
