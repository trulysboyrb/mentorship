import { DEFAULT_PRICING, type Pricing } from "./pricing";

// What the whole site needs to know about the admin's settings. Comes from the database function
// site_status() (readable by everyone, contains nothing secret).
export type SiteStatus = {
  price_online: number;
  price_in_person: number;
  referral_percent: number;
  pay_wave: boolean;
  pay_card: boolean;
  pay_crypto: boolean;
  pay_whatsapp: boolean;
  signups_open: boolean;
  maintenance: boolean;
  banner_on: boolean;
  banner_text: string;
  banner_tone: BannerTone;
  contact_whatsapp: string; // digits only, or "" to use the number in lib/config.ts
  contact_email: string;
  contact_business: string;
  contact_hours: string;
  local_prices_on: boolean; // show approximate prices in the visitor's currency
  gmd_per_usd: number | null; // the admin's dalasi per US dollar (public, it is only a rate)
  is_admin: boolean;
};

export type BannerTone = "info" | "success" | "warning";

export const DEFAULT_STATUS: SiteStatus = {
  price_online: DEFAULT_PRICING.online,
  price_in_person: DEFAULT_PRICING.in_person,
  referral_percent: DEFAULT_PRICING.referralPercent,
  pay_wave: true,
  pay_card: true,
  pay_crypto: true,
  pay_whatsapp: true,
  signups_open: true,
  maintenance: false,
  banner_on: false,
  banner_text: "",
  banner_tone: "info",
  contact_whatsapp: "",
  contact_email: "",
  contact_business: "The Forbes Academy",
  contact_hours: "",
  local_prices_on: true,
  gmd_per_usd: null,
  is_admin: false,
};

const int = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
};
const text = (v: unknown, max: number, fallback: string) =>
  typeof v === "string" ? v.trim().slice(0, max) : fallback;
const rate = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 && n < 100000 ? n : null;
};
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);

// Never throws. If the SQL has not been run yet (or the call fails) the site keeps working
// with the starting values.
export function parseSiteStatus(raw: unknown): SiteStatus {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const d = DEFAULT_STATUS;
  return {
    price_online: int(r.price_online, 1, 1_000_000, d.price_online),
    price_in_person: int(r.price_in_person, 1, 1_000_000, d.price_in_person),
    referral_percent: int(r.referral_percent, 0, 50, d.referral_percent),
    pay_wave: bool(r.pay_wave, d.pay_wave),
    pay_card: bool(r.pay_card, d.pay_card),
    pay_crypto: bool(r.pay_crypto, d.pay_crypto),
    pay_whatsapp: bool(r.pay_whatsapp, d.pay_whatsapp),
    signups_open: bool(r.signups_open, d.signups_open),
    maintenance: bool(r.maintenance, d.maintenance),
    banner_on: bool(r.banner_on, d.banner_on),
    banner_text: text(r.banner_text, 200, d.banner_text),
    banner_tone: r.banner_tone === "success" || r.banner_tone === "warning" ? r.banner_tone : "info",
    contact_whatsapp: typeof r.contact_whatsapp === "string" && /^[0-9]{6,15}$/.test(r.contact_whatsapp) ? r.contact_whatsapp : "",
    contact_email: typeof r.contact_email === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(r.contact_email.trim()) ? r.contact_email.trim() : "",
    contact_business: text(r.contact_business, 80, d.contact_business) || d.contact_business,
    contact_hours: text(r.contact_hours, 120, d.contact_hours),
    local_prices_on: bool(r.local_prices_on, d.local_prices_on),
    gmd_per_usd: rate(r.gmd_per_usd),
    is_admin: bool(r.is_admin, d.is_admin),
  };
}

export function pricingOf(s: SiteStatus): Pricing {
  return { online: s.price_online, in_person: s.price_in_person, referralPercent: s.referral_percent };
}

// Pages students must not use while maintenance mode is on. Login, signup, legal pages and the
// admin area are never blurred, so you can always get in to switch it off.
const STUDENT_PREFIXES = ["/dashboard", "/classes", "/quiz", "/profile", "/pay", "/pending", "/device-limit"];

export function isStudentArea(pathname: string): boolean {
  return STUDENT_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// The banner shows on the same pages students use (not login, signup, legal pages or admin).
export function bannerVisible(s: SiteStatus, pathname: string): boolean {
  return s.banner_on && s.banner_text.length > 0 && isStudentArea(pathname);
}
