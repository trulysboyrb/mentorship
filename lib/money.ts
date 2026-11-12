import { cache } from "react";
import { cookies, headers } from "next/headers";
import { countryFromHeaders, resolveCurrency, type MoneyCtx, type Resolved } from "@/lib/currency";
import { fxFor, getUsdRates } from "@/lib/fx";
import type { SiteStatus } from "@/lib/siteSettings";

export const CURRENCY_COOKIE = "apex_cur";

// Server side: which currency does this visitor see? Their own choice (cookie) first, then the
// country the host detected from their address, then US dollars.
export const getResolvedCurrency = cache(async (): Promise<Resolved> => {
  try {
    const h = await headers();
    const c = await cookies();
    return resolveCurrency({
      chosen: c.get(CURRENCY_COOKIE)?.value ?? null,
      country: countryFromHeaders((n) => h.get(n)),
    });
  } catch {
    return resolveCurrency({});
  }
});

// Everything a page needs to show prices. Never throws: on any problem the visitor sees dalasi or dollars.
export async function getMoneyCtx(site: SiteStatus): Promise<{ ctx: MoneyCtx; resolved: Resolved }> {
  const resolved = await getResolvedCurrency();
  let fx: number | null = null;
  if (site.local_prices_on && resolved.code !== "GMD" && resolved.code !== "USD") {
    const { rates } = await getUsdRates();
    fx = fxFor(resolved.code, rates);
  }
  return {
    resolved,
    ctx: { code: resolved.code, fx, gmdPerUsd: site.gmd_per_usd, enabled: site.local_prices_on },
  };
}
