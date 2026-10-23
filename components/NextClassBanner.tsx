"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { canJoinNow, classState, minutesUntil, type ClassRow } from "@/lib/classes";
import { formatCountdown } from "@/lib/sessions";

// Small card at the top of the dashboard: the next live class. It turns green and offers
// the join button when the class is about to start or running.
export default function NextClassBanner({
  classes,
  reminders,
}: {
  classes: ClassRow[];
  reminders: string[];
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const next = classes
    .filter((c) => classState(c, now) !== "ended")
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))[0];
  if (!next) return null;

  const st = classState(next, now);
  const hot = st === "live" || (st === "soon" && reminders.includes(next.id));
  const mins = minutesUntil(next.starts_at, now);

  return (
    <div className={`mt-6 flex flex-wrap items-center justify-between gap-3 rounded-card border bg-surface p-4 ${hot ? "border-accent" : "border-line"}`}>
      <div className="min-w-0">
        <p className="text-[10px] font-extrabold tracking-widest text-accent uppercase">
          {st === "live" ? "Live now" : "Next live class"}
        </p>
        <p className="mt-1 truncate text-sm font-semibold">{next.title}</p>
        <p className="mt-0.5 text-xs text-muted" suppressHydrationWarning>
          {st === "live"
            ? "Running now"
            : `Starts in ${formatCountdown(mins)} · ${new Date(next.starts_at).toLocaleString("en-GB", {
                weekday: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}`}
        </p>
      </div>
      <div className="flex gap-3">
        {next.kind === "online" && next.join_url && canJoinNow(next, now) && (
          <a
            href={next.join_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-control bg-accent px-4 py-2 text-xs font-extrabold tracking-wider text-black uppercase"
          >
            Join
          </a>
        )}
        <Link
          href="/classes"
          className="rounded-control border border-line px-4 py-2 text-xs font-semibold tracking-wider uppercase hover:border-accent"
        >
          All classes
        </Link>
      </div>
    </div>
  );
}
