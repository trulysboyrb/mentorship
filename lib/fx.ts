// Exchange rates for the approximate prices. Units of each currency per 1 US dollar.
// Live rates come from open.er-api.com (free, no key) and are cached for 6 hours by Next.js.
// If that service is down, or sends something odd, the built-in rough rates below are used.
// These rates only affect the approximate price SHOWN. What is charged is always in dalasi or US dollars.

import { SUPPORTED_CURRENCIES, type CurrencyCode } from "./currency";

export const FALLBACK_USD_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.38, AUD: 1.52, NZD: 1.65, CHF: 0.88, NOK: 10.8, SEK: 10.6, DKK: 6.9,
  PLN: 4.0, CZK: 23, HUF: 370, RON: 4.6, TRY: 34, JPY: 150, CNY: 7.2, KRW: 1350, INR: 84, PKR: 278, BDT: 120,
  AED: 3.67, SAR: 3.75, QAR: 3.64, KWD: 0.31, ILS: 3.7, EGP: 49, MAD: 10, NGN: 1500, GHS: 15, KES: 129,
  UGX: 3700, TZS: 2700, RWF: 1350, ETB: 120, ZAR: 18, XOF: 600, SGD: 1.35, MYR: 4.5, THB: 35, IDR: 15800,
  PHP: 57, VND: 25000, BRL: 5.5, MXN: 19, ARS: 1000, CLP: 950, COP: 4200, PEN: 3.8,
};

export type Rates = { rates: Record<string, number>; live: boolean };

// Accept a live rate only if it is a sane number, not wildly different from the fallback.
export function cleanRates(raw: unknown): Record<string, number> | null {
  const r = (raw as { result?: unknown; rates?: unknown } | null) ?? null;
  if (!r || r.result !== "success" || !r.rates || typeof r.rates !== "object") return null;
  const out: Record<string, number> = { USD: 1 };
  let good = 0;
  for (const code of SUPPORTED_CURRENCIES) {
    if (code === "GMD" || code === "USD") continue;
    const v = (r.rates as Record<string, unknown>)[code];
    const fb = FALLBACK_USD_RATES[code];
    if (typeof v === "number" && Number.isFinite(v) && v > 0 && v > fb / 5 && v < fb * 5) {
      out[code] = v;
      good++;
    }
  }
  return good >= 10 ? out : null; // too few usable numbers: do not trust the response
}

export async function getUsdRates(fetchFn: typeof fetch = fetch): Promise<Rates> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 3000);
    const res = await fetchFn("https://open.er-api.com/v6/latest/USD", {
      signal: ctl.signal,
      // Next.js caches this for 6 hours, so we do not call the service on every visit.
      next: { revalidate: 21600 },
    } as RequestInit);
    clearTimeout(t);
    if (res.ok) {
      const live = cleanRates(await res.json());
      if (live) return { rates: { ...FALLBACK_USD_RATES, ...live }, live: true };
    }
  } catch {
    /* use the fallback below */
  }
  return { rates: FALLBACK_USD_RATES, live: false };
}

export function fxFor(code: CurrencyCode, rates: Record<string, number>): number | null {
  if (code === "GMD") return null;
  const v = rates[code];
  return typeof v === "number" && v > 0 ? v : null;
}
