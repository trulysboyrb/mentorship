// Course prices. Change the numbers here and every page updates.
// Amounts are in Gambian dalasi (GMD).

export const PRICES = {
  online: 7000,
  in_person: 10000,
} as const;

// Discount for students who join with a valid referral code (one-time payment).
export const REFERRAL_DISCOUNT_PERCENT = 5;

export function formatGMD(amount: number): string {
  return `D${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} GMD`;
}

export function priceFor(mode: string | null | undefined, referred: boolean) {
  const base = mode === "in_person" ? PRICES.in_person : PRICES.online;
  const final = referred
    ? Math.round((base * (100 - REFERRAL_DISCOUNT_PERCENT)) / 100)
    : base;
  return { base, final, saved: base - final };
}
