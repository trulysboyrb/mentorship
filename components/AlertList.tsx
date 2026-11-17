"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ago } from "@/lib/activityView";

export type AlertRow = {
  id: number;
  at: string;
  kind: "payment" | "underpaid" | "payout";
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
};

const DOT: Record<AlertRow["kind"], string> = { payment: "bg-accent", underpaid: "bg-danger", payout: "bg-white" };

export default function AlertList({ rows }: { rows: AlertRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const unread = rows.filter((r) => !r.read_at).length;

  async function markRead() {
    setBusy(true);
    setError("");
    const { error } = await createClient().rpc("admin_mark_alerts_read");
    setBusy(false);
    if (error) return setError(error.message);
    router.refresh();
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{unread > 0 ? `${unread} new` : "You are all caught up."}</p>
        <button
          onClick={markRead}
          disabled={busy || unread === 0}
          className="rounded-control border border-line px-4 py-2 text-xs font-extrabold tracking-wider uppercase hover:border-accent disabled:opacity-40"
        >
          Mark all as read
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <ul className="mt-4 divide-y divide-line border border-line bg-surface">
        {rows.map((r) => {
          const inner = (
            <div className="flex items-start gap-3 px-4 py-3">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[r.kind]} ${r.read_at ? "opacity-30" : ""}`} />
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${r.read_at ? "text-muted" : "font-bold"}`}>{r.title}</p>
                {r.body && <p className="mt-0.5 text-xs break-words text-muted">{r.body}</p>}
              </div>
              <time dateTime={r.at} className="shrink-0 text-xs text-muted">{ago(r.at)}</time>
            </div>
          );
          return (
            <li key={r.id} className={r.read_at ? "" : "bg-surface-2"}>
              {r.link ? <Link href={r.link} className="block hover:bg-surface-2">{inner}</Link> : inner}
            </li>
          );
        })}
        {rows.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">No alerts yet.</li>}
      </ul>
    </div>
  );
}
