const SYMBOLS = ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "BTC/USD", "ETH/USD", "US30", "NAS100", "GBP/JPY", "AUD/USD", "SOL/USD", "USD/CAD"];

// A slowly scrolling strip of popular markets. Names only, no prices.
export default function Ticker() {
  const row = [...SYMBOLS, ...SYMBOLS];
  return (
    <div className="marquee overflow-hidden border-y border-line bg-surface/60 py-3" aria-hidden>
      <div className="marquee-track">
        {row.concat(row).map((s, i) => (
          <span key={i} className="mx-6 flex items-center gap-3 text-xs font-bold tracking-widest text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
