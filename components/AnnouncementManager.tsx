"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { inputCls, labelCls } from "@/components/ui";

type Item = { id: string; title: string; body: string; created_at: string };

export default function AnnouncementManager({ items }: { items: Item[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function post(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim() || !body.trim()) return setError("Please fill in both the title and the message.");
    setBusy(true);
    const { error } = await supabase
      .from("announcements")
      .insert({ title: title.trim(), body: body.trim() });
    setBusy(false);
    if (error) return setError(error.message);
    setTitle("");
    setBody("");
    router.refresh();
  }

  async function remove(a: Item) {
    if (!window.confirm(`Delete "${a.title}"? Students will stop seeing it.`)) return;
    setError("");
    const { error } = await supabase.from("announcements").delete().eq("id", a.id);
    if (error) setError(error.message);
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-10">
      <form onSubmit={post} className="space-y-5 rounded-card border border-line bg-surface p-6">
        <h3 className="text-xs font-extrabold tracking-widest uppercase">New announcement</h3>
        <p className="text-xs text-muted">
          Shown at the top of the student area to every cleared student, live. The latest 3 are displayed.
        </p>
        <div>
          <label className={labelCls} htmlFor="a_title">Title</label>
          <input id="a_title" maxLength={120} className={inputCls} value={title}
            placeholder="e.g. Live Q&A this Saturday"
            onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="a_body">Message</label>
          <textarea id="a_body" rows={5} maxLength={2000} className={inputCls} value={body}
            onChange={(e) => setBody(e.target.value)} />
        </div>
        {error && <p className="break-words text-sm text-danger">{error}</p>}
        <button type="submit" disabled={busy}
          className="rounded-control bg-accent px-8 py-3 text-xs font-extrabold tracking-wider text-black uppercase disabled:opacity-50">
          {busy ? "Posting..." : "Post announcement"}
        </button>
      </form>

      <section>
        <h3 className="text-xs font-extrabold tracking-widest uppercase">Posted ({items.length})</h3>
        <ul className="mt-4 space-y-3">
          {items.length === 0 && (
            <li className="rounded-card border border-line bg-surface p-6 text-sm text-muted">
              Nothing posted yet.
            </li>
          )}
          {items.map((a) => (
            <li key={a.id} className="rounded-card border border-line bg-surface p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold">{a.title}</p>
                  <p className="mt-1 text-[11px] text-muted" suppressHydrationWarning>
                    {new Date(a.created_at).toLocaleString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
                <button onClick={() => remove(a)}
                  className="rounded-control border border-line px-3 py-1.5 text-xs font-semibold tracking-wider text-muted uppercase hover:border-danger hover:text-danger">
                  Delete
                </button>
              </div>
              <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-white/70">{a.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
