// Helpers for YouTube (unlisted) lessons. Pure functions, no network.

const ID = /^[A-Za-z0-9_-]{11}$/;

// Accepts watch links, youtu.be short links, embed, shorts, live links, or a bare 11-character ID.
export function parseYouTubeId(input: string): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  if (ID.test(raw)) return raw;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "").toLowerCase();

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return ID.test(id) ? id : null;
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "music.youtube.com") {
    const v = url.searchParams.get("v");
    if (v && ID.test(v)) return v;
    const parts = url.pathname.split("/").filter(Boolean);
    if (["embed", "shorts", "live", "v"].includes(parts[0] ?? "") && ID.test(parts[1] ?? "")) return parts[1];
  }
  return null;
}

export function watchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

// The ID of a stored video_url, or null if it is not a YouTube link.
export function youTubeIdFromStored(videoUrl: string | null | undefined): string | null {
  return videoUrl ? parseYouTubeId(videoUrl) : null;
}

// "12:34", "1:02:03" or "754" (seconds) -> seconds. Returns null if it does not look right.
export function parseDuration(input: string): number | null {
  const s = (input ?? "").trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    return n > 0 && n <= 86400 ? n : null;
  }
  const m = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const h = m[1] ? Number(m[1]) : 0;
  const min = Number(m[2]);
  const sec = Number(m[3]);
  if (sec > 59 || (m[1] && min > 59)) return null;
  const total = h * 3600 + min * 60 + sec;
  return total > 0 && total <= 86400 ? total : null;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "";
  const t = Math.round(seconds);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export type BulkLine = { line: number; title: string | null; id: string | null; error: string | null };

// One lesson per line:  "Title | link"   or just   "link".
// Blank lines are skipped. The same video twice in the list is flagged.
export function parseBulkLines(text: string): BulkLine[] {
  const out: BulkLine[] = [];
  const seen = new Set<string>();
  (text ?? "").split(/\r?\n/).forEach((rawLine, i) => {
    const line = rawLine.trim();
    if (!line) return;
    const bar = line.lastIndexOf("|");
    const titlePart = bar >= 0 ? line.slice(0, bar).trim() : "";
    const linkPart = bar >= 0 ? line.slice(bar + 1).trim() : line;
    const id = parseYouTubeId(linkPart);
    if (!id) {
      out.push({ line: i + 1, title: titlePart || null, id: null, error: "Not a YouTube link" });
      return;
    }
    if (seen.has(id)) {
      out.push({ line: i + 1, title: titlePart || null, id, error: "Same video appears twice" });
      return;
    }
    seen.add(id);
    out.push({ line: i + 1, title: titlePart ? titlePart.slice(0, 120) : null, id, error: null });
  });
  return out;
}
