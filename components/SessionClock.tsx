"use client";

import { useEffect, useState } from "react";
import { SESSIONS, formatCountdown, statusAt, utcRange } from "@/lib/sessions";

const pctOf = (min: number) => `${(min / 1440) * 100}%`;

export default function SessionClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return (
      <section className="mt-10">
        <h2 className="text-xs font-extrabold tracking-widest uppercase">Market sessions</h2>
        <div className="mt-4 h-40 rounded-card border border-line bg-surface" />
      </section>
    );
  }

  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const rows = SESSIONS.map((s) => ({ s, st: statusAt(s, now), range: utcRange(s, now) }));
  const openNames = rows.filter((r) => r.st.open).map((r) => r.s.city);

  return (
    <section className="mt-10">
      <h2 className="text-xs font-extrabold tracking-widest uppercase">Market sessions</h2>
      <div className="mt-4 rounded-card border border-line bg-surface p-5">
        <p className="text-sm text-muted" suppressHydrationWarning>
          Now:{" "}
          <span className="text-white">
            {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </span>{" "}
          your time. Open: {openNames.length ? openNames.join(", ") : "none (weekend or between sessions)"}.
        </p>

        <ul className="mt-5 space-y-5">
          {rows.map(({ s, st, range }) => {
            const wraps = range.end < range.start;
            return (
              <li key={s.id}>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-semibold">{s.city}</span>
                  <span className={st.open ? "text-accent" : "text-muted"}>
                    {st.open ? "Open" : "Closed"} &middot;{" "}
                    {st.open ? "closes" : "opens"} in {formatCountdown(st.minutesToChange)}
                  </span>
                </div>
                <div className="relative mt-2 h-3 bg-surface-2">
                  {wraps ? (
                    <>
                      <div className="absolute top-0 h-full bg-accent/60"
                        style={{ left: pctOf(range.start), width: pctOf(1440 - range.start) }} />
                      <div className="absolute top-0 h-full bg-accent/60"
                        style={{ left: 0, width: pctOf(range.end) }} />
                    </>
                  ) : (
                    <div className="absolute top-0 h-full bg-accent/60"
                      style={{ left: pctOf(range.start), width: pctOf(range.end - range.start) }} />
                  )}
                  <div className="absolute -top-1 h-5 w-0.5 bg-white" style={{ left: pctOf(utcMinutes) }} />
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-2 flex justify-between text-[10px] text-muted">
          <span>00:00 UTC</span><span>12:00</span><span>24:00</span>
        </div>
        <p className="mt-4 text-xs text-muted">
          Hours are the usual local opening hours of each city, so daylight saving is handled for
          you. Bars show UTC (Gambia time). The white line is now. Markets are closed at the weekend.
        </p>
      </div>
    </section>
  );
}
