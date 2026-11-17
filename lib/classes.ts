// Helpers for the live class schedule.

export type ClassRow = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  duration_minutes: number;
  kind: "online" | "in_person";
  join_url: string | null;
  location: string | null;
};

export type ClassState = "upcoming" | "soon" | "live" | "ended";

// "soon" = starts within the next 60 minutes. The join link is shown from 15 minutes before.
export function classState(c: Pick<ClassRow, "starts_at" | "duration_minutes">, now = new Date()): ClassState {
  const start = new Date(c.starts_at).getTime();
  const end = start + c.duration_minutes * 60_000;
  const t = now.getTime();
  if (t >= end) return "ended";
  if (t >= start) return "live";
  if (start - t <= 60 * 60_000) return "soon";
  return "upcoming";
}

export function canJoinNow(c: Pick<ClassRow, "starts_at" | "duration_minutes">, now = new Date()): boolean {
  const start = new Date(c.starts_at).getTime();
  const end = start + c.duration_minutes * 60_000;
  const t = now.getTime();
  return t >= start - 15 * 60_000 && t < end;
}

export function minutesUntil(iso: string, now = new Date()): number {
  return Math.round((new Date(iso).getTime() - now.getTime()) / 60_000);
}

// Upcoming (or running) classes first, soonest first; ended ones go in a separate list.
export function splitClasses<T extends Pick<ClassRow, "starts_at" | "duration_minutes">>(rows: T[], now = new Date()) {
  const upcoming: T[] = [];
  const past: T[] = [];
  for (const r of rows) (classState(r, now) === "ended" ? past : upcoming).push(r);
  upcoming.sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  past.sort((a, b) => +new Date(b.starts_at) - +new Date(a.starts_at));
  return { upcoming, past };
}
