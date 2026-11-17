// Splits "D 7,000 total" into prefix, number and suffix so the number can count up.
export function parseCount(value: string): { prefix: string; n: number; suffix: string; commas: boolean } | null {
  const m = /^([^\d]*)(\d{1,3}(?:,\d{3})+|\d+)([^\d.]*)$/.exec(value);
  if (!m) return null; // decimals, ranges or text: show as is
  const n = Number(m[2].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  return { prefix: m[1], n, suffix: m[3], commas: m[2].includes(",") };
}

export function formatCount(n: number, commas: boolean): string {
  const r = Math.round(n);
  return commas ? r.toLocaleString("en-US") : String(r);
}

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
