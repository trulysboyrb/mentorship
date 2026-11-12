import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { countryFromHeaders, resolveCurrency } from "@/lib/currency";
import { fxFor, getUsdRates } from "@/lib/fx";
import { CURRENCY_COOKIE } from "@/lib/money";

export const dynamic = "force-dynamic";

// For pages that run in the browser (signup): which currency to show and the rate for it.
// Public and harmless: it only returns the visitor's own currency and an exchange rate.
export async function GET() {
  const h = await headers();
  const c = await cookies();
  const resolved = resolveCurrency({
    chosen: c.get(CURRENCY_COOKIE)?.value ?? null,
    country: countryFromHeaders((n) => h.get(n)),
  });
  let fx: number | null = null;
  if (resolved.code !== "GMD" && resolved.code !== "USD") {
    fx = fxFor(resolved.code, (await getUsdRates()).rates);
  }
  return NextResponse.json({ ...resolved, fx }, { headers: { "Cache-Control": "no-store" } });
}
