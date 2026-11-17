"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { inputCls } from "@/components/ui";

export type Comment = {
  id: string;
  parent_id: string | null;
  user_id: string;
  author_name: string;
  is_staff: boolean;
  body: string;
  created_at: string;
};

const MAX = 1000;
const linkBtn = "text-xs text-muted hover:text-white";

export default function LessonComments({
  lessonId,
  comments,
  userId,
  isAdmin,
}: {
  lessonId: string;
  comments: Comment[];
  userId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const top = comments.filter((c) => !c.parent_id);
  const repliesOf = (id: string) => comments.filter((c) => c.parent_id === id);

  async function post(body: string, parent: string | null) {
    setError("");
    if (!body.trim()) return false;
    setBusy(true);
    const { error } = await supabase.rpc("post_comment", {
      p_lesson: lessonId,
      p_body: body,
      p_parent: parent,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return false;
    }
    router.refresh();
    return true;
  }

  async function remove(c: Comment) {
    const extra = c.parent_id ? "" : " Its replies will be deleted too.";
    if (!window.confirm(`Delete this comment?${extra}`)) return;
    setError("");
    const { error } = await supabase.from("lesson_comments").delete().eq("id", c.id);
    if (error) setError(error.message);
    router.refresh();
  }

  const when = (iso: string) => (
    <span suppressHydrationWarning>
      {new Date(iso).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
  );

  const item = (c: Comment, nested: boolean) => (
    <div className={nested ? "border-l border-line pl-4" : ""}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm font-semibold">{c.author_name}</span>
        {c.is_staff && (
          <span className="rounded-control border border-accent px-2 py-0.5 text-[9px] font-extrabold tracking-widest text-accent uppercase">
            Instructor
          </span>
        )}
        <span className="text-[11px] text-muted">{when(c.created_at)}</span>
      </div>
      <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-white/80">{c.body}</p>
      <div className="mt-2 flex gap-4">
        {!nested && (
          <button className={linkBtn} onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyText(""); }}>
            Reply
          </button>
        )}
        {(c.user_id === userId || isAdmin) && (
          <button className={`${linkBtn} hover:!text-danger`} onClick={() => remove(c)}>
            Delete
          </button>
        )}
      </div>
    </div>
  );

  return (
    <section className="rounded-card border border-line bg-surface p-6">
      <h3 className="text-xs font-extrabold tracking-widest uppercase">
        Questions &amp; comments{top.length > 0 ? ` (${comments.length})` : ""}
      </h3>
      <p className="mt-2 text-xs text-muted">
        Visible to other students and instructors, shown with your first name and last initial.
        Please keep it respectful and on topic.
      </p>

      <form
        className="mt-5 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await post(text, null)) setText("");
        }}
      >
        <textarea
          rows={3}
          maxLength={MAX}
          className={inputCls}
          placeholder="Ask a question about this lesson..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted">{text.length} / {MAX}</span>
          <button
            type="submit"
            disabled={busy || !text.trim()}
            className="rounded-control bg-white px-6 py-2.5 text-xs font-extrabold tracking-wider text-black uppercase transition hover:bg-accent disabled:opacity-50"
          >
            Post
          </button>
        </div>
      </form>

      {error && <p className="mt-3 break-words text-sm text-danger">{error}</p>}

      <ul className="mt-6 space-y-6">
        {top.length === 0 && (
          <li className="text-sm text-muted">No questions yet. Be the first to ask.</li>
        )}
        {top.map((c) => (
          <li key={c.id}>
            {item(c, false)}

            {repliesOf(c.id).length > 0 && (
              <div className="mt-4 ml-3 space-y-4">
                {repliesOf(c.id).map((r) => (
                  <div key={r.id}>{item(r, true)}</div>
                ))}
              </div>
            )}

            {replyTo === c.id && (
              <form
                className="mt-4 ml-3 space-y-3 border-l border-accent pl-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await post(replyText, c.id)) {
                    setReplyTo(null);
                    setReplyText("");
                  }
                }}
              >
                <textarea
                  rows={2}
                  maxLength={MAX}
                  autoFocus
                  className={inputCls}
                  placeholder={`Reply to ${c.author_name}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={busy || !replyText.trim()}
                    className="rounded-control bg-white px-5 py-2 text-xs font-extrabold tracking-wider text-black uppercase hover:bg-accent disabled:opacity-50"
                  >
                    Reply
                  </button>
                  <button type="button" className={linkBtn} onClick={() => setReplyTo(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
