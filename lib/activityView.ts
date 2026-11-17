// Turns activity-log rows into readable lines. Pure, so it can be tested.

export type AuditRow = {
  id: number;
  at: string;
  actor_name: string;
  action: string;
  target_label: string | null;
  detail: Record<string, unknown> | null;
};

export type ActivityGroup = "students" | "certificates" | "money" | "settings" | "other";

export const GROUPS: { id: "all" | ActivityGroup; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "students", label: "Students" },
  { id: "certificates", label: "Certificates" },
  { id: "money", label: "Payouts" },
  { id: "settings", label: "Settings" },
];

export function groupOf(action: string): ActivityGroup {
  if (action.startsWith("student.") || action === "role.changed") return "students";
  if (action.startsWith("certificate.")) return "certificates";
  if (action.startsWith("payout.")) return "money";
  if (action === "setting.changed") return "settings";
  return "other";
}

const SETTING_NAMES: Record<string, string> = {
  price_online: "online price",
  price_in_person: "in person price",
  referral_percent: "referral discount",
  pay_wave_on: "Wave payments",
  pay_card_on: "Card payments",
  pay_crypto_on: "Crypto payments",
  pay_whatsapp_on: "WhatsApp payments",
  signups_open: "signups",
  maintenance_on: "maintenance mode",
  banner_on: "site banner",
  banner_text: "banner message",
  banner_tone: "banner colour",
  contact_whatsapp: "WhatsApp number",
  contact_email: "support email",
  contact_business: "business name",
  contact_hours: "opening hours",
  cert_template_path: "certificate template",
  cert_layout: "certificate layout",
  alert_payment_on: "payment alerts",
  alert_underpaid_on: "underpaid alerts",
  alert_payout_on: "payout alerts",
  alert_email: "alert email",
  max_devices: "devices per student",
  referral_reward: "referral reward",
  min_payout: "minimum payout",
  gmd_per_usd: "crypto rate",
};

const SWITCHES = new Set([
  "pay_wave_on", "pay_card_on", "pay_crypto_on", "pay_whatsapp_on", "signups_open",
  "maintenance_on", "banner_on", "alert_payment_on", "alert_underpaid_on", "alert_payout_on",
]);

const str = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v) : "");

export function describe(r: AuditRow): string {
  const who = r.target_label || "a student";
  const d = r.detail ?? {};
  switch (r.action) {
    case "student.cleared":
      return r.actor_name === "Automatic"
        ? `${who} was cleared automatically${d.via ? ` (paid by ${str(d.via)})` : ""}`
        : `${who} was cleared${d.via ? ` (${str(d.via)})` : ""}`;
    case "student.locked":
      return `${who} was set back to pending (courses locked)`;
    case "student.deleted":
      return `${who} was deleted${d.email ? ` (${str(d.email)})` : ""}`;
    case "role.changed":
      return `${who} changed from ${str(d.from) || "?"} to ${str(d.to) || "?"}`;
    case "certificate.issued":
      return `Certificate given to ${who}${d.serial ? ` (${str(d.serial)})` : ""}`;
    case "certificate.removed":
      return `A certificate was removed from ${who}`;
    case "payout.paid":
      return `Payout of D${str(d.amount)} marked as paid to ${who}`;
    case "payout.rejected":
      return `Payout of D${str(d.amount)} for ${who} was rejected`;
    case "setting.changed": {
      const key = r.target_label ?? "";
      const name = SETTING_NAMES[key] ?? key;
      if (d.note) return `${name} was changed`;
      if (SWITCHES.has(key)) return `${name} turned ${str(d.to) === "1" ? "ON" : "OFF"}`;
      const to = str(d.to);
      const from = str(d.from);
      return to === "" ? `${name} was cleared` : from === "" ? `${name} set to "${to}"` : `${name} changed from "${from}" to "${to}"`;
    }
    default:
      return r.action;
  }
}

export function matches(r: AuditRow, group: "all" | ActivityGroup, needle: string): boolean {
  if (group !== "all" && groupOf(r.action) !== group) return false;
  const n = needle.trim().toLowerCase();
  if (!n) return true;
  return `${describe(r)} ${r.actor_name}`.toLowerCase().includes(n);
}

export function ago(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
