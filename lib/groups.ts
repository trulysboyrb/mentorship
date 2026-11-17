// Rules for the people in an in-person group. Same rules as the database (Phase 22 SQL).
export type GroupMember = { name: string; whatsapp: string };

export const WHATSAPP_RE = /^[0-9+][0-9 +()-]{5,19}$/;

export function cleanMembers(list: GroupMember[]): GroupMember[] {
  return list.map((m) => ({ name: m.name.trim().replace(/\s+/g, " "), whatsapp: m.whatsapp.trim() }));
}

const digits = (v: string) => v.replace(/\D/g, "");

// `others` are the people besides the one signing up. `max` counts everyone, including the person signing up.
// Returns a plain-English problem, or null when the list is fine.
export function memberError(others: GroupMember[], max: number, leaderWhatsapp: string): string | null {
  const list = cleanMembers(others);
  if (list.length < 1) return "A group needs at least 2 people. Add the other person's name and WhatsApp number.";
  if (list.length + 1 > max) return `A group can have at most ${max} people.`;
  const seen = new Set<string>();
  if (leaderWhatsapp.trim()) seen.add(digits(leaderWhatsapp));
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    const who = `Person ${i + 2}`;
    if (m.name.length < 2 || m.name.length > 80) return `${who}: please enter a full name.`;
    if (!WHATSAPP_RE.test(m.whatsapp)) return `${who}: please enter a WhatsApp number with the country code, e.g. 2207000000.`;
    const d = digits(m.whatsapp);
    if (seen.has(d)) return `${who}: this WhatsApp number is already used by someone else in the group.`;
    seen.add(d);
  }
  return null;
}
