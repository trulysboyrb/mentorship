// Simple password strength hint for the signup page. It is only advice: the real rule is 8+ characters.
export type Strength = { score: 0 | 1 | 2 | 3 | 4; label: string };

export function passwordStrength(pw: string): Strength {
  if (!pw) return { score: 0, label: "" };
  let pts = 0;
  if (pw.length >= 8) pts++;
  if (pw.length >= 12) pts++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) pts++;
  if (/\d/.test(pw)) pts++;
  if (/[^A-Za-z0-9]/.test(pw)) pts++;
  if (/^(.)\1+$/.test(pw) || /^(password|12345678|qwertyui)/i.test(pw)) pts = Math.min(pts, 1);
  if (pw.length < 8) return { score: 1, label: "Too short" };
  const score = Math.max(1, Math.min(4, pts)) as 1 | 2 | 3 | 4;
  return { score, label: ["", "Weak", "Okay", "Good", "Strong"][score] };
}

export function validEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());
}
