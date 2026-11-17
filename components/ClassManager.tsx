"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { inputCls, labelCls } from "@/components/ui";
import type { ClassRow } from "@/lib/classes";

// <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in the admin's own time zone.
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const empty = {
  title: "",
  description: "",
  when: "",
  duration: "60",
  kind: "online" as "online" | "in_person",
  joinUrl: "",
  location: "",
};

export default function ClassManager({ items }: { items: ClassRow[] }) {
  const router = useRouter();
  const [f, setF] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof typeof empty>(k: K, v: (typeof empty)[K]) => setF((x) => ({ ...x, [k]: v }));

  function edit(c: ClassRow) {
    setEditing(c.id);
    setF({
      title: c.title,
      description: c.description ?? "",
      when: toLocalInput(c.starts_at),
      duration: String(c.duration_minutes),
      kind: c.kind,
      joinUrl: c.join_url ?? "",
      location: c.location ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setEditing(null);
    setF(empty);
    setError("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const starts = new Date(f.when);
    if (!f.title.trim()) return setError("Please give the class a title.");
    if (!f.when || Number.isNaN(starts.getTime())) return setError("Please pick the date and time.");
    const url = f.joinUrl.trim();
    if (url && !/^https?:\/\//i.test(url)) return setError("The join link must start with https://");

    const row = {
      title: f.title.trim(),
      description: f.description.trim() || null,
      starts_at: starts.toISOString(),
      duration_minutes: Number(f.duration) || 60,
      kind: f.kind,
      join_url: f.kind === "online" ? url || null : null,
      location: f.kind === "in_person" ? f.location.trim() || null : null,
    };

    setBusy(true);
    const supabase = createClient();
    const { error } = editing
      ? await supabase.from("live_classes").update(row).eq("id", editing)
      : await supabase.from("live_classes").insert(row);
    setBusy(false);
    if (error) return setError(error.message);
    reset();
    router.refresh();
  }

  async function remove(c: ClassRow) {
    if (!window.confirm(`Delete "${c.title}"? Students will stop seeing it.`)) return;
    const { error } = await createClient().from("live_classes").delete().eq("id", c.id);
    if (error) setError(error.message);
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-10">
      <form onSubmit={save} className="space-y-5 rounded-card border border-line bg-surface p-6">
        <h3 className="text-xs font-extrabold tracking-widest uppercase">
          {editing ? "Edit class" : "Schedule a class"}
        </h3>
        <div>
          <label className={labelCls} htmlFor="c_title">Title</label>
          <input id="c_title" maxLength={120} className={inputCls} value={f.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="c_when">Starts (your time)</label>
            <input id="c_when" type="datetime-local" className={inputCls} value={f.when} onChange={(e) => set("when", e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="c_dur">Length (minutes)</label>
            <input id="c_dur" type="number" min={15} max={480} className={inputCls} value={f.duration} onChange={(e) => set("duration", e.target.value)} />
          </div>
        </div>
        <div>
          <span className={labelCls}>Type</span>
          <div className="flex gap-3">
            {(["online", "in_person"] as const).map((k) => (
              <button
                type="button"
                key={k}
                onClick={() => set("kind", k)}
                className={`rounded-control border px-4 py-2 text-xs font-semibold tracking-wider uppercase ${
                  f.kind === k ? "border-accent text-white" : "border-line text-muted"
                }`}
              >
                {k === "online" ? "Online" : "In person"}
              </button>
            ))}
          </div>
        </div>
        {f.kind === "online" ? (
          <div>
            <label className={labelCls} htmlFor="c_url">Join link (Zoom, Google Meet, ...)</label>
            <input id="c_url" className={inputCls} placeholder="https://meet.google.com/..." value={f.joinUrl} onChange={(e) => set("joinUrl", e.target.value)} />
            <p className="mt-2 text-xs text-muted">Students only see the Join button from 15 minutes before the class starts.</p>
          </div>
        ) : (
          <div>
            <label className={labelCls} htmlFor="c_loc">Place</label>
            <input id="c_loc" maxLength={200} className={inputCls} placeholder="Where the class takes place" value={f.location} onChange={(e) => set("location", e.target.value)} />
          </div>
        )}
        <div>
          <label className={labelCls} htmlFor="c_desc">What it covers (optional)</label>
          <textarea id="c_desc" rows={3} maxLength={1000} className={inputCls} value={f.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        {error && <p className="break-words text-sm text-danger">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={busy} className="rounded-control bg-accent px-6 py-3 text-xs font-extrabold tracking-wider text-black uppercase disabled:opacity-50">
            {editing ? "Save changes" : "Schedule class"}
          </button>
          {editing && (
            <button type="button" onClick={reset} className="rounded-control border border-line px-6 py-3 text-xs font-semibold tracking-wider text-muted uppercase">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div>
        <h3 className="text-xs font-extrabold tracking-widest uppercase">All classes</h3>
        <ul className="mt-4 space-y-3">
          {items.length === 0 && <li className="text-sm text-muted">No classes yet.</li>}
          {items.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface p-4">
              <div className="min-w-0">
                <p className="font-semibold">{c.title}</p>
                <p className="mt-1 text-xs text-muted" suppressHydrationWarning>
                  {new Date(c.starts_at).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  {" · "}{c.duration_minutes} min · {c.kind === "online" ? "Online" : `In person${c.location ? `, ${c.location}` : ""}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => edit(c)} className="rounded-control border border-line px-3 py-1.5 text-xs font-semibold tracking-wider text-white uppercase hover:border-accent">Edit</button>
                <button onClick={() => remove(c)} className="rounded-control border border-line px-3 py-1.5 text-xs font-semibold tracking-wider text-muted uppercase hover:border-danger hover:text-danger">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
