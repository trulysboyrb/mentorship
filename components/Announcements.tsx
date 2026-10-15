"use client";

import { useEffect, useState } from "react";

type Item = { id: string; title: string; body: string; created_at: string };

const KEY = "apex-dismissed-announcements";

// Shows the latest announcements. "Dismiss" hides one on this device only.
export default function Announcements({ items }: { items: Item[] }) {
  const [dismissed, setDismissed] = useState<string[] | null>(null);

  useEffect(() => {
    try {
      setDismissed(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
    } catch {
      setDismissed([]);
    }
  }, []);

  function dismiss(id: string) {
    const next = [...(dismissed ?? []), id];
    setDismissed(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next.slice(-50)));
    } catch {
      // storage unavailable: the announcement simply comes back next visit
    }
  }

  if (dismissed === null) return null;
  const visible = items.filter((i) => !dismissed.includes(i.id));
  if (visible.length === 0) return null;

  return (
    <div className="mt-6 space-y-3">
      {visible.map((a) => (
        <div key={a.id} className="rounded-card border border-line border-l-accent border-l-2 bg-surface p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold tracking-widest text-accent uppercase">
                Announcement
              </p>
              <h3 className="mt-1 font-bold">{a.title}</h3>
            </div>
            <button
              onClick={() => dismiss(a.id)}
              className="text-xs text-muted hover:text-white"
            >
              Dismiss
            </button>
          </div>
          <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-white/70">{a.body}</p>
          <p className="mt-3 text-[11px] text-muted">
            {new Date(a.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      ))}
    </div>
  );
}
