// Forex session clocks. Hours are the usual LOCAL opening hours of each city, so
// daylight saving is handled by the device's own time zone data.

export type SessionDef = {
  id: string;
  city: string;
  tz: string;
  open: number; // minutes after local midnight
  close: number;
};

export const SESSIONS: SessionDef[] = [
  { id: "sydney", city: "Sydney", tz: "Australia/Sydney", open: 8 * 60, close: 17 * 60 },
  { id: "tokyo", city: "Tokyo", tz: "Asia/Tokyo", open: 9 * 60, close: 18 * 60 },
  { id: "london", city: "London", tz: "Europe/London", open: 8 * 60, close: 17 * 60 },
  { id: "newyork", city: "New York", tz: "America/New_York", open: 8 * 60, close: 17 * 60 },
];

const WEEKDAY: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const cache = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string) {
  let f = cache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      weekday: "short",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    cache.set(tz, f);
  }
  return f;
}

export function localParts(date: Date, tz: string) {
  const parts = formatter(tz).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));
  const asUtc = Date.UTC(
    Number(get("year")),
    Number(get("month")) - 1,
    Number(get("day")),
    hour,
    minute,
    Number(get("second"))
  );
  const wholeSecond = Math.floor(date.getTime() / 1000) * 1000;
  return {
    weekday: WEEKDAY[get("weekday")] ?? 0,
    minutes: hour * 60 + minute,
    offsetMin: Math.round((asUtc - wholeSecond) / 60000),
  };
}

export function statusAt(session: SessionDef, date: Date) {
  const p = localParts(date, session.tz);
  const weekdayNow = p.weekday >= 1 && p.weekday <= 5;

  if (weekdayNow && p.minutes >= session.open && p.minutes < session.close) {
    return { open: true, minutesToChange: session.close - p.minutes };
  }

  for (let add = 0; add < 8; add++) {
    const wd = (p.weekday + add) % 7;
    if (wd >= 1 && wd <= 5) {
      const delta = add * 1440 + session.open - p.minutes;
      if (delta > 0) return { open: false, minutesToChange: delta };
    }
  }
  return { open: false, minutesToChange: 0 };
}

// Where the session sits on a 24 hour UTC axis (for the timeline bars).
export function utcRange(session: SessionDef, date: Date) {
  const { offsetMin } = localParts(date, session.tz);
  const mod = (n: number) => ((n % 1440) + 1440) % 1440;
  return { start: mod(session.open - offsetMin), end: mod(session.close - offsetMin) };
}

export function formatCountdown(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${mm}m`;
  return `${mm}m`;
}
