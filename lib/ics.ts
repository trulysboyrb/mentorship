// Builds a calendar file (.ics) for one live class, with an alarm 30 minutes before.
// Opens in Google Calendar, Apple Calendar and Outlook, so students get a real reminder
// on their phone even when the website is closed.

export type IcsEvent = {
  id: string;
  title: string;
  description?: string | null;
  startsAt: Date;
  durationMinutes: number;
  location?: string | null;
  url?: string | null;
};

const pad = (n: number) => String(n).padStart(2, "0");

function stamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// Lines longer than 75 bytes must be folded.
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (new TextEncoder().encode(rest).length > 75) {
    let cut = 75;
    while (new TextEncoder().encode(rest.slice(0, cut)).length > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out.join("\r\n");
}

export function buildIcs(ev: IcsEvent, now = new Date()): string {
  const end = new Date(ev.startsAt.getTime() + ev.durationMinutes * 60_000);
  const desc = [ev.description?.trim(), ev.url ? `Join: ${ev.url}` : ""].filter(Boolean).join("\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ApexTrade Academy//Live class//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.id}@apextrade-academy`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(ev.startsAt)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(ev.title)}`,
  ];
  if (desc) lines.push(`DESCRIPTION:${esc(desc)}`);
  if (ev.location?.trim()) lines.push(`LOCATION:${esc(ev.location.trim())}`);
  if (ev.url) lines.push(`URL:${ev.url}`);
  lines.push(
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(ev.title)} starts in 30 minutes`,
    "TRIGGER:-PT30M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  );
  return lines.map(fold).join("\r\n") + "\r\n";
}
