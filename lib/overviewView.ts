import { priceFor } from "./pricing";

export type OverviewData = {
  totals: {
    students: number;
    cleared: number;
    pending: number;
    signups_today: number;
    signups_7d: number;
    signups_30d: number;
    cleared_7d: number;
    cleared_30d: number;
  };
  online: {
    total: number;
    d7: number;
    d30: number;
    count: number;
    by_method: { k: string; n: number; gmd: number }[];
  };
  days: { day: string; signups: number; cleared: number; online_gmd: number }[];
  methods: { k: string; n: number }[];
  stale_pending: { count: number; list: { id: string; name: string; whatsapp: string | null; created_at: string }[] };
  at_risk: {
    count: number;
    list: { id: string; name: string; whatsapp: string | null; last_active: string | null; cleared_at: string }[];
  };
  attention: { underpaid: number; flagged: number; unmatched: number; payouts: number };
  recent: { kind: "signup" | "cleared"; name: string; detail: string | null; at: string }[];
};

export type ClearedRow = {
  learning_mode: string | null;
  referral_discount: boolean;
  cleared_via: string | null;
  cleared_at: string | null;
};

const DAY = 24 * 60 * 60 * 1000;

// Students cleared by an admin (or WhatsApp) have no payment record, so their money is
// ESTIMATED from the current prices. Online payments (Wave, Card, Crypto) are real amounts.
export function revenueSplit(rows: ClearedRow[], online: { total: number; d7: number; d30: number }, now = Date.now()) {
  let manualTotal = 0;
  let manual7 = 0;
  let manual30 = 0;
  let manualCount = 0;
  for (const r of rows) {
    if (r.cleared_via && !["manual", "whatsapp"].includes(r.cleared_via)) continue;
    const { final } = priceFor(r.learning_mode, r.referral_discount);
    manualTotal += final;
    manualCount += 1;
    const t = r.cleared_at ? new Date(r.cleared_at).getTime() : NaN;
    if (Number.isFinite(t)) {
      if (now - t <= 7 * DAY) manual7 += final;
      if (now - t <= 30 * DAY) manual30 += final;
    }
  }
  return {
    manualCount,
    total: { online: online.total, manual: manualTotal, all: online.total + manualTotal },
    d7: { online: online.d7, manual: manual7, all: online.d7 + manual7 },
    d30: { online: online.d30, manual: manual30, all: online.d30 + manual30 },
  };
}

export function timeAgo(iso: string | null, now = Date.now()): string {
  if (!iso) return "never";
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export function waLink(number: string | null, text: string): string | null {
  const digits = (number ?? "").replace(/[^0-9]/g, "");
  if (digits.length < 6) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
