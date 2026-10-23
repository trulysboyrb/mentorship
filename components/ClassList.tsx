"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buildIcs } from "@/lib/ics";
import { canJoinNow, classState, splitClasses, type ClassRow } from "@/lib/classes";
import { formatCountdown } from "@/lib/sessions";

const btn =
  "rounded-control border border-line px-4 py-2 text-xs font-semibold tracking-wider text-white uppercase hover:border-accent disabled:opacity-40";

function whenText(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function download(c: ClassRow) {
  const ics = buildIcs({
    id: c.id,
    title: c.title,
    description: c.description,
    startsAt: new Date(c.starts_at),
    durationMinutes: c.duration_minutes,
    location: c.kind === "in_person" ? c.location : "Online",
    url: c.join_url,
  });
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "live-class.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function ClassList({
  classes,
  reminders,
  userId,
}: {
  classes: ClassRow[];
  reminders: string[];
  userId: string;
}) {
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);
  const [mine, setMine] = useState(() => new Set(reminders));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  async function toggle(c: ClassRow) {
    setBusy(c.id);
    setError("");
    const supabase = createClient();
    const on = mine.has(c.id);
    const { error } = on
      ? await supabase.from("class_reminders").delete().eq("class_id", c.id).eq("user_id", userId)
      : await supabase.from("class_reminders").insert({ class_id: c.id, user_id: userId });
    setBusy(null);
    if (error) return setError(error.message);
    const next = new Set(mine);
    if (on) next.delete(c.id);
    else {
      next.add(c.id);
      download(c); // also puts it in their phone calendar with an alarm
    }
    setMine(next);
    router.refresh();
  }

  if (!now) return <div className="mt-8 h-32 rounded-card border border-line bg-surface" />;

  const { upcoming, past } = splitClasses(classes, now);

  const card = (c: ClassRow, ended: boolean) => {
    const st = classState(c, now);
    const mins = Math.round((new Date(c.starts_at).getTime() - now.getTime()) / 60_000);
    return (
      <li key={c.id} className="rounded-card border border-line bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{c.title}</p>
            <p className="mt-1 text-xs text-muted" suppressHydrationWarning>
              {whenText(c.starts_at)} &middot; {c.duration_minutes} min &middot;{" "}
              {c.kind === "in_person" ? `In person${c.location ? `, ${c.location}` : ""}` : "Online"}
            </p>
          </div>
          {!ended && (
            <span
              className={`text-[10px] font-extrabold tracking-widest uppercase ${
                st === "live" ? "text-accent" : "text-muted"
              }`}
            >
              {st === "live" ? "Live now" : `Starts in ${formatCountdown(mins)}`}
            </span>
          )}
        </div>

        {c.description && (
          <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-white/70">{c.description}</p>
        )}

        {!ended && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {c.kind === "online" && c.join_url && (
              canJoinNow(c, now) ? (
                <a
                  href={c.join_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-control bg-accent px-5 py-2 text-xs font-extrabold tracking-wider text-black uppercase"
                >
                  Join class
                </a>
              ) : (
                <span className="text-xs text-muted">The join button appears 15 minutes before it starts.</span>
              )
            )}
            <button className={btn} disabled={busy === c.id} onClick={() => toggle(c)}>
              {mine.has(c.id) ? "Reminder set (tap to remove)" : "Remind me"}
            </button>
            {mine.has(c.id) && (
              <button className={btn} onClick={() => download(c)}>
                Add to calendar again
              </button>
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <>
      {error && <p className="mt-4 break-words text-sm text-danger">{error}</p>}

      <h2 className="mt-8 text-xs font-extrabold tracking-widest uppercase">Coming up</h2>
      {upcoming.length === 0 ? (
        <p className="mt-4 rounded-card border border-line bg-surface p-6 text-sm text-muted">
          No live classes are scheduled right now. Check back soon.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">{upcoming.map((c) => card(c, false))}</ul>
      )}

      {past.length > 0 && (
        <>
          <h2 className="mt-10 text-xs font-extrabold tracking-widest uppercase">Past classes</h2>
          <ul className="mt-4 space-y-4 opacity-70">{past.slice(0, 10).map((c) => card(c, true))}</ul>
        </>
      )}

      <p className="mt-6 text-xs leading-relaxed text-muted">
        &quot;Remind me&quot; downloads a calendar file with an alarm 30 minutes before the class. Open it
        on your phone and it is added to your calendar. You will also see a banner here when a class
        you set a reminder for is about to start.
      </p>
    </>
  );
}
