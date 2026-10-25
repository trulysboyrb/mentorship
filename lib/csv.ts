// CSV export for the students table. Cells starting with = + - @ are prefixed with an apostrophe so
// a spreadsheet never runs them as a formula.
export function csvCell(v: string | number | null | undefined): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}
