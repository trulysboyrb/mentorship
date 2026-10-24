// Money helpers. Prices are in whole dalasi; crypto is priced in US dollars.

// Round UP to the cent so we never charge a little less than the dalasi price.
export function gmdToUsd(gmd: number, gmdPerUsd: number): number | null {
  if (!Number.isFinite(gmd) || !Number.isFinite(gmdPerUsd) || gmd <= 0 || gmdPerUsd <= 0) return null;
  return Math.ceil((gmd / gmdPerUsd) * 100 - 1e-9) / 100;
}

export function formatUsd(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
