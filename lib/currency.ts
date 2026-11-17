// Show prices in the visitor's own currency. Pure functions, no network, so they can be tested.
//
// How the money works (important):
//   * The price is always set in Gambian dalasi (GMD) by the admin. That never changes.
//   * Visitors in the Gambia see dalasi and can pay by Wave, card (in dalasi) or crypto.
//   * Everyone else sees an approximate price in their own currency. Card and crypto are charged
//     in US dollars, worked out from the admin's dalasi-per-dollar rate (the same one crypto uses).
//     Wave is only for the Gambia, so it is hidden elsewhere.

import { gmdToUsd } from "./paymentMath";
import { formatGMD } from "./pricing";

export const SUPPORTED_CURRENCIES = [
  "USD", "EUR", "GBP", "GMD", "CAD", "AUD", "NZD", "CHF", "NOK", "SEK", "DKK", "PLN", "CZK", "HUF", "RON",
  "TRY", "JPY", "CNY", "KRW", "INR", "PKR", "BDT", "AED", "SAR", "QAR", "KWD", "ILS", "EGP", "MAD", "NGN",
  "GHS", "KES", "UGX", "TZS", "RWF", "ETB", "ZAR", "XOF", "SGD", "MYR", "THB", "IDR", "PHP", "VND", "BRL",
  "MXN", "ARS", "CLP", "COP", "PEN",
] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: CurrencyCode = "USD";

export function isCurrency(v: unknown): v is CurrencyCode {
  return typeof v === "string" && (SUPPORTED_CURRENCIES as readonly string[]).includes(v);
}

const list = (code: CurrencyCode, countries: string) =>
  countries.split(" ").map((c) => [c, code] as const);

// Country (ISO 3166 two letters) -> currency. Any country not listed falls back to US dollars.
const COUNTRY_TABLE: Record<string, CurrencyCode> = Object.fromEntries([
  ...list("GMD", "GM"),
  ...list("USD", "US PR GU VI AS MP EC SV PA TL ZW LR"),
  ...list("EUR", "AT BE BG HR CY EE FI FR DE GR IE IT LV LT LU MT NL PT SK SI ES AD MC SM VA ME XK"),
  ...list("GBP", "GB IM JE GG"),
  ...list("CAD", "CA"),
  ...list("AUD", "AU"),
  ...list("NZD", "NZ"),
  ...list("CHF", "CH LI"),
  ...list("NOK", "NO"),
  ...list("SEK", "SE"),
  ...list("DKK", "DK"),
  ...list("PLN", "PL"),
  ...list("CZK", "CZ"),
  ...list("HUF", "HU"),
  ...list("RON", "RO"),
  ...list("TRY", "TR"),
  ...list("JPY", "JP"),
  ...list("CNY", "CN"),
  ...list("KRW", "KR"),
  ...list("INR", "IN"),
  ...list("PKR", "PK"),
  ...list("BDT", "BD"),
  ...list("AED", "AE"),
  ...list("SAR", "SA"),
  ...list("QAR", "QA"),
  ...list("KWD", "KW"),
  ...list("ILS", "IL"),
  ...list("EGP", "EG"),
  ...list("MAD", "MA"),
  ...list("NGN", "NG"),
  ...list("GHS", "GH"),
  ...list("KES", "KE"),
  ...list("UGX", "UG"),
  ...list("TZS", "TZ"),
  ...list("RWF", "RW"),
  ...list("ETB", "ET"),
  ...list("ZAR", "ZA"),
  ...list("XOF", "SN CI ML BF NE TG BJ GW"),
  ...list("SGD", "SG"),
  ...list("MYR", "MY"),
  ...list("THB", "TH"),
  ...list("IDR", "ID"),
  ...list("PHP", "PH"),
  ...list("VND", "VN"),
  ...list("BRL", "BR"),
  ...list("MXN", "MX"),
  ...list("ARS", "AR"),
  ...list("CLP", "CL"),
  ...list("COP", "CO"),
  ...list("PEN", "PE"),
]);

export function currencyForCountry(country: string | null | undefined): CurrencyCode {
  const c = (country ?? "").trim().toUpperCase();
  return COUNTRY_TABLE[c] ?? DEFAULT_CURRENCY;
}

export type Resolved = {
  code: CurrencyCode;
  country: string | null; // detected country, uppercase, or null
  source: "chosen" | "country" | "default";
};

// A currency the visitor picked (saved in a cookie) wins over the detected country.
export function resolveCurrency(input: { chosen?: string | null; country?: string | null }): Resolved {
  const country = /^[A-Za-z]{2}$/.test(input.country ?? "") ? String(input.country).toUpperCase() : null;
  const chosen = (input.chosen ?? "").trim().toUpperCase();
  if (isCurrency(chosen)) return { code: chosen, country, source: "chosen" };
  if (country && COUNTRY_TABLE[country]) return { code: COUNTRY_TABLE[country], country, source: "country" };
  return { code: DEFAULT_CURRENCY, country, source: "default" };
}

// Read the country the hosting platform detected from the visitor's address.
// Vercel sets x-vercel-ip-country. Cloudflare sets cf-ipcountry. Nothing is set on your own computer.
export function countryFromHeaders(get: (name: string) => string | null | undefined): string | null {
  for (const h of ["x-vercel-ip-country", "cf-ipcountry"]) {
    const v = (get(h) ?? "").trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(v) && v !== "XX" && v !== "T1") return v;
  }
  return null;
}

// ---- Rounding and formatting -------------------------------------------------------------

// Keep 3 significant figures: 91.74 -> 92, 149873 -> 150000. Never below a whole unit.
export function niceRound(x: number): number {
  if (!Number.isFinite(x) || x <= 0) return 0;
  if (x < 100) return Math.max(1, Math.round(x));
  const digits = Math.floor(Math.log10(x)) + 1;
  const step = Math.pow(10, digits - 3);
  return Math.round(x / step) * step;
}

export function formatMoney(amount: number, code: string, maxFraction = 0, minFraction = 0): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: minFraction,
      maximumFractionDigits: maxFraction,
    }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString("en-US")} ${code}`;
  }
}

export function formatUsdPrice(usd: number): string {
  return Number.isInteger(usd) ? formatMoney(usd, "USD", 0) : formatMoney(usd, "USD", 2, 2);
}

// Everything a page needs to turn a dalasi price into text.
export type MoneyCtx = {
  code: CurrencyCode;
  fx: number | null; // units of `code` per 1 US dollar (null when unknown)
  gmdPerUsd: number | null; // the admin's rate
  enabled: boolean; // admin switch "Show prices in the visitor's currency"
};

export const GMD_CTX: MoneyCtx = { code: "GMD", fx: null, gmdPerUsd: null, enabled: false };

export type PriceText = {
  text: string; // what to show: "D7,000", "$100", "≈ €92"
  code: CurrencyCode; // currency actually shown
  usd: number | null; // what card and crypto will charge (null when shown in dalasi)
};

const gmdText = formatGMD; // same dalasi style the site always used: "D7,000.00 GMD"

// Turn a dalasi amount into text for this visitor. Falls back to dalasi whenever anything is missing,
// so a failed rate lookup can never show a wrong or empty price.
export function priceText(gmd: number, ctx: MoneyCtx): PriceText {
  if (ctx.code === "GMD" || !ctx.enabled || !ctx.gmdPerUsd || ctx.gmdPerUsd <= 0) {
    return { text: gmdText(gmd), code: "GMD", usd: null };
  }
  const usd = gmdToUsd(gmd, ctx.gmdPerUsd);
  if (usd === null) return { text: gmdText(gmd), code: "GMD", usd: null };
  if (ctx.code === "USD") return { text: formatUsdPrice(usd), code: "USD", usd };
  if (!ctx.fx || ctx.fx <= 0) return { text: formatUsdPrice(usd), code: "USD", usd }; // no rate: show dollars
  return { text: `≈ ${formatMoney(niceRound(usd * ctx.fx), ctx.code)}`, code: ctx.code, usd };
}

// A short line for the pay pages, for example: "Cards and crypto are charged in US dollars: $100".
export function chargeNote(gmd: number, ctx: MoneyCtx): string | null {
  const p = priceText(gmd, ctx);
  if (p.usd === null) return null;
  return p.code === "USD" ? null : `Cards and crypto are charged in US dollars: ${formatUsdPrice(p.usd)}.`;
}

// ---- What the server charges -------------------------------------------------------------

export type Charge = { currency: "GMD" | "USD"; amount: number };

// Card: dalasi for visitors in the Gambia, US dollars for everyone else.
export function cardCharge(gmd: number, ctx: Pick<MoneyCtx, "code" | "gmdPerUsd">): Charge | null {
  if (ctx.code === "GMD") return { currency: "GMD", amount: gmd };
  const usd = ctx.gmdPerUsd ? gmdToUsd(gmd, ctx.gmdPerUsd) : null;
  return usd === null ? null : { currency: "USD", amount: usd };
}

// Wave only works for people in the Gambia.
export function waveAllowed(code: CurrencyCode): boolean {
  return code === "GMD";
}

// Modem Pay tells us what it received in the charge currency. Our database compares in dalasi.
// This turns the paid amount into dalasi (full price when fully paid, a share when short).
export function paidGmdFor(
  pay: { currency: string | null; amount_gmd: number; amount_charged: number | null },
  paid: number | null
): number | null {
  if (paid === null || !Number.isFinite(paid)) return null;
  if (!pay.currency || pay.currency === "GMD") return paid;
  const charged = pay.amount_charged;
  if (!charged || charged <= 0) return null;
  if (paid >= charged - 0.01) return pay.amount_gmd;
  return Math.floor((pay.amount_gmd * paid) / charged);
}
