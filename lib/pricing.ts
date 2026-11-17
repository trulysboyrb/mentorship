// Course prices and the referral discount.
// The LIVE values are set by the admin in Admin > Settings (stored in the database).
// The numbers below are only the starting values, used if the settings cannot be read.
// Amounts are in Gambian dalasi (GMD).

export const PRICES = {
  online: 7000,
  in_person: 10000,
} as const;

// Discount for students who join with a valid referral code (one-time payment).
export const REFERRAL_DISCOUNT_PERCENT = 5;

export type Pricing = { online: number; in_person: number; referralPercent: number };

export const DEFAULT_PRICING: Pricing = {
  online: PRICES.online,
  in_person: PRICES.in_person,
  referralPercent: REFERRAL_DISCOUNT_PERCENT,
};

export function formatGMD(amount: number): string {
  return `D${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} GMD`;
}

export function priceFor(mode: string | null | undefined, referred: boolean, pricing: Pricing = DEFAULT_PRICING) {
  const base = mode === "in_person" ? pricing.in_person : pricing.online;
  const final = referred ? Math.round((base * (100 - pricing.referralPercent)) / 100) : base;
  return { base, final, saved: base - final };
}
