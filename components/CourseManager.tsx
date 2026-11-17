"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { inputCls } from "@/components/ui";
import { detectYouTubeDuration } from "@/lib/youtubeApi";
import { formatDuration, parseBulkLines, parseDuration, parseYouTubeId, watchUrl, youTubeIdFromStored } from "@/lib/youtube";

const BUCKET = "course-videos";
const MAX_MB = 50; // Supabase free plan limit per file

type Content = {
  notes: string | null;
  video_path: string | null;
  video_url: string | null;
  duration_seconds?: number | null;
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
  const [ytLink, setYtLink] = useState<Record<string, string>>({});
  const [ytLen, setYtLen] = useState<Record<string, string>>({});
  const [ytBusy, setYtBusy] = useState<string | null>(null);
  const [ytNote, setYtNote] = useState<Record<string, string>>({});
  const [bulkText, setBulkText] = useState<Record<string, string>>({});
  const [bulkMsg, setBulkMsg] = useState<Record<string, string>>({});
  const [bulkBusy, setBulkBusy] = useState<string | null>(null);

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

  // ----- YouTube (unlisted) videos -----
  async function saveYouTube(l: Lesson) {
    setError("");
    setYtNote((n) => ({ ...n, [l.id]: "" }));
    const id = parseYouTubeId(ytLink[l.id] ?? "");
    if (!id) {
      setError("That is not a YouTube link. Paste the link from YouTube's Share button.");
      return;
    }
    setYtBusy(l.id);
    let dur = parseDuration(ytLen[l.id] ?? "");
    if (dur === null) {
      setYtNote((n) => ({ ...n, [l.id]: "Reading the video length from YouTube..." }));
      dur = await detectYouTubeDuration(id);
    }
    if (dur === null) {
      setYtBusy(null);
      setYtNote((n) => ({
        ...n,
        [l.id]: "Could not read the length automatically. Type it in the Length box (for example 12:34) and press Save again.",
      }));
      return;
    }
    const old = l.content?.video_path;
    await run(() =>
      supabase
        .from("lesson_content")
        .upsert({ lesson_id: l.id, video_url: watchUrl(id), video_path: null, duration_seconds: dur })
    );
    if (old) await supabase.storage.from(BUCKET).remove([old]);
    setYtLink((n) => ({ ...n, [l.id]: "" }));
    setYtLen((n) => ({ ...n, [l.id]: "" }));
    setYtNote((n) => ({ ...n, [l.id]: `Saved. Length ${formatDuration(dur)}.` }));
    setYtBusy(null);
  }

  async function saveLength(l: Lesson) {
    const dur = parseDuration(ytLen[l.id] ?? "");
    if (dur === null) {
      setError("Type the length like 12:34 (minutes:seconds) or 1:02:03.");
      return;
    }
    await run(() => supabase.from("lesson_content").update({ duration_seconds: dur }).eq("lesson_id", l.id));
    setYtLen((n) => ({ ...n, [l.id]: "" }));
  }

  // Many lessons at once from a list of links.
  async function bulkAdd(m: Module) {
    setError("");
    const lines = parseBulkLines(bulkText[m.id] ?? "");
    const good = lines.filter((x) => !x.error && x.id);
    const bad = lines.filter((x) => x.error);
    if (good.length === 0) {
      setBulkMsg((n) => ({ ...n, [m.id]: bad.length ? bad.map((b) => `Line ${b.line}: ${b.error}`).join(". ") : "Paste at least one link first." }));
      return;
    }
    setBulkBusy(m.id);
    setBulkMsg((n) => ({ ...n, [m.id]: "Reading titles from YouTube..." }));

    const need = good.filter((g) => !g.title).map((g) => g.id as string);
    let found: Record<string, string | null> = {};
    if (need.length) {
      try {
        const res = await fetch("/api/admin/youtube-info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: need }),
        });
        const j = (await res.json()) as { titles?: Record<string, string | null> };
        found = j.titles ?? {};
      } catch {
        found = {};
      }
    }

    let position = m.lessons[m.lessons.length - 1]?.position ?? 0;
    let added = 0;
    const noLength: string[] = [];
    for (const g of good) {
      const id = g.id as string;
      setBulkMsg((n) => ({ ...n, [m.id]: `Adding lesson ${added + 1} of ${good.length}...` }));
      position += 1;
      const title = g.title || found[id] || `Lesson ${position}`;
      const { data: row, error: insErr } = await supabase
        .from("lessons")
        .insert({ module_id: m.id, position, title })
        .select("id")
        .single();
      if (insErr || !row) {
        setError(`Stopped at "${title}": ${insErr?.message ?? "could not add"}. ${added} lesson(s) were added before this.`);
        break;
      }
      const dur = await detectYouTubeDuration(id);
      if (dur === null) noLength.push(title);
      const { error: cErr } = await supabase
        .from("lesson_content")
        .upsert({ lesson_id: row.id, video_url: watchUrl(id), video_path: null, duration_seconds: dur });
      if (cErr) {
        setError(`Added "${title}" but could not save its video: ${cErr.message}`);
        break;
      }
      added += 1;
    }

    const parts = [`Added ${added} lesson${added === 1 ? "" : "s"}.`];
    if (noLength.length) parts.push(`${noLength.length} need their length typed in (open the lesson and fill the Length box): ${noLength.join(", ")}.`);
    if (bad.length) parts.push(`Skipped: ${bad.map((b) => `line ${b.line} (${b.error})`).join(", ")}.`);
    setBulkMsg((n) => ({ ...n, [m.id]: parts.join(" ") }));
    if (added > 0) setBulkText((n) => ({ ...n, [m.id]: "" }));
    setBulkBusy(null);
    router.refresh();
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
              const ytId = !l.content?.video_path ? youTubeIdFromStored(l.content?.video_url) : null;
              return (
                <li key={l.id} className="rounded-control border border-line bg-surface-2">
                  <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <button onClick={() => setOpenLesson(isOpen ? null : l.id)}
                      className="flex-1 text-left text-sm font-medium">
                      {l.title}
                      <span
                        className={`ml-3 text-[10px] tracking-widest uppercase ${
                          ytId && !l.content?.duration_seconds ? "text-danger" : hasVideo ? "text-accent" : "text-muted"
                        }`}
                      >
                        {ytId
                          ? l.content?.duration_seconds
                            ? `YouTube · ${formatDuration(l.content.duration_seconds)}`
                            : "YouTube · needs length"
                          : hasVideo
                            ? "Video uploaded"
                            : "No video"}
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
                          YouTube video (set it to Unlisted on YouTube)
                        </p>
                        {ytId && (
                          <p className="mb-3 text-xs text-muted">
                            Current: youtu.be/{ytId}
                            {l.content?.duration_seconds ? ` · length ${formatDuration(l.content.duration_seconds)}` : " · length missing, students cannot progress until you set it"}
                          </p>
                        )}
                        <input
                          placeholder="Paste the YouTube link"
                          className={inputCls}
                          value={ytLink[l.id] ?? ""}
                          onChange={(e) => setYtLink((n) => ({ ...n, [l.id]: e.target.value }))}
                        />
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <input
                            placeholder="Length e.g. 12:34 (optional)"
                            className={`${inputCls} max-w-[13rem] !py-2`}
                            value={ytLen[l.id] ?? ""}
                            onChange={(e) => setYtLen((n) => ({ ...n, [l.id]: e.target.value }))}
                          />
                          <button
                            className={`${smallBtn} !border-accent !text-accent`}
                            disabled={ytBusy === l.id || !(ytLink[l.id] ?? "").trim()}
                            onClick={() => saveYouTube(l)}
                          >
                            {ytBusy === l.id ? "Saving..." : "Save YouTube video"}
                          </button>
                          {ytId && !(ytLink[l.id] ?? "").trim() && (
                            <button className={smallBtn} disabled={!(ytLen[l.id] ?? "").trim()} onClick={() => saveLength(l)}>
                              Update length only
                            </button>
                          )}
                          {ytId && (
                            <button className={smallBtn} onClick={() => removeVideo(l)}>
                              Remove video
                            </button>
                          )}
                        </div>
                        {ytNote[l.id] && <p className="mt-2 text-xs text-muted">{ytNote[l.id]}</p>}
                      </div>

                      <div>
                        <p className="mb-2 text-[10px] font-semibold tracking-widest text-muted uppercase">
                          Or upload a file (mp4 or webm, max {MAX_MB} MB)
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

          <details className="mt-4 rounded-control border border-line bg-surface-2 p-4">
            <summary className="cursor-pointer text-xs font-semibold tracking-wider text-accent uppercase">
              Add many lessons from YouTube links
            </summary>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              One lesson per line, in the order you want. Write <b>Title | link</b>, or just the link and we will read
              the title from YouTube. New lessons go to the end of this module.
            </p>
            <textarea
              rows={6}
              className={`${inputCls} mt-3 font-mono !text-xs`}
              placeholder={"What is a pip? | https://youtu.be/xxxxxxxxxxx\nhttps://youtu.be/yyyyyyyyyyy"}
              value={bulkText[m.id] ?? ""}
              onChange={(e) => setBulkText((n) => ({ ...n, [m.id]: e.target.value }))}
            />
            <button
              className={`${smallBtn} mt-3 !border-accent !text-accent`}
              disabled={bulkBusy === m.id || !(bulkText[m.id] ?? "").trim()}
              onClick={() => bulkAdd(m)}
            >
              {bulkBusy === m.id ? "Adding..." : "Add these lessons"}
            </button>
            {bulkMsg[m.id] && <p className="mt-3 break-words text-xs text-muted">{bulkMsg[m.id]}</p>}
          </details>

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
