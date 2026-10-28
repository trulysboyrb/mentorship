"use client";

import { useState } from "react";
import { GROUPS, ago, describe, matches, type AuditRow } from "@/lib/activityView";

const chip = (on: boolean) =>
  `rounded-control border px-3 py-1.5 text-xs font-semibold ${on ? "border-accent text-accent" : "border-line text-muted hover:text-white"}`;

export default function ActivityLog({ rows }: { rows: AuditRow[] }) {
  const [group, setGroup] = useState<(typeof GROUPS)[number]["id"]>("all");
  const [q, setQ] = useState("");
  const shown = rows.filter((r) => matches(r, group, q));

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        {GROUPS.map((g) => (
          <button key={g.id} onClick={() => setGroup(g.id)} className={chip(group === g.id)} aria-pressed={group === g.id}>
            {g.label}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or action"
          aria-label="Search the activity log"
          className="ml-auto w-full rounded-control border border-line bg-black px-3 py-1.5 text-xs text-white placeholder:text-muted/70 focus:border-accent focus:outline-none sm:w-56"
        />
      </div>

      <ul className="mt-4 divide-y divide-line border border-line bg-surface">
        {shown.map((r) => (
          <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
            <span className="min-w-0 break-words">
              <span className="font-semibold">{r.actor_name}</span>
              <span className="text-muted"> &middot; </span>
              {describe(r)}
            </span>
            <time dateTime={r.at} title={new Date(r.at).toLocaleString()} className="shrink-0 text-xs text-muted">
              {ago(r.at)}
            </time>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted">
            {rows.length === 0 ? "Nothing has been recorded yet." : "Nothing matches."}
          </li>
        )}
      </ul>
      <p className="mt-3 text-xs text-muted">Showing the latest {rows.length} entries. Nobody can edit or delete this log from the app.</p>
    </div>
  );
}
