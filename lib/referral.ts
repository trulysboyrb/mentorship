import { BRAND } from "./config";
import { REFERRAL_DISCOUNT_PERCENT } from "./pricing";

// Same cleaning the database does: letters and numbers only, upper case.
export function normalizeReferralCode(input: string): string {
  return input.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function referralLink(origin: string, code: string): string {
  return `${origin}/signup?ref=${encodeURIComponent(code)}`;
}

export function referralShareText(origin: string, code: string, percent: number = REFERRAL_DISCOUNT_PERCENT): string {
  return `Join ${BRAND} and get ${percent}% off with my referral code ${code}: ${referralLink(origin, code)}`;
}
