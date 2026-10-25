// A decorative candlestick chart that draws itself. It is an illustration, not real market data.
const CANDLES: { o: number; c: number; h: number; l: number }[] = [
  { o: 150, c: 138, h: 124, l: 158 },
  { o: 138, c: 144, h: 130, l: 152 },
  { o: 144, c: 128, h: 118, l: 150 },
  { o: 128, c: 134, h: 120, l: 140 },
  { o: 134, c: 118, h: 108, l: 140 },
  { o: 118, c: 124, h: 112, l: 130 },
  { o: 124, c: 104, h: 96, l: 130 },
  { o: 104, c: 112, h: 98, l: 118 },
  { o: 112, c: 94, h: 86, l: 116 },
  { o: 94, c: 100, h: 88, l: 106 },
  { o: 100, c: 82, h: 74, l: 104 },
  { o: 82, c: 90, h: 76, l: 96 },
  { o: 90, c: 70, h: 62, l: 94 },
  { o: 70, c: 76, h: 64, l: 82 },
  { o: 76, c: 56, h: 46, l: 80 },
  { o: 56, c: 62, h: 50, l: 68 },
  { o: 62, c: 42, h: 32, l: 66 },
  { o: 42, c: 36, h: 24, l: 50 },
];

export default function HeroChart({ className = "" }: { className?: string }) {
  const step = 22;
  const w = CANDLES.length * step + 20;
  const trend = CANDLES.map((k, i) => `${i === 0 ? "M" : "L"}${14 + i * step + 6},${(k.o + k.c) / 2}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} 180`} className={className} role="img" aria-label="Illustration of a rising price chart" preserveAspectRatio="xMidYMid meet">
      <g className="text-line" stroke="currentColor" strokeWidth="1" opacity="0.7">
        {[30, 70, 110, 150].map((y) => (
          <line key={y} x1="0" x2={w} y1={y} y2={y} strokeDasharray="3 5" />
        ))}
      </g>
      {CANDLES.map((k, i) => {
        const up = k.c < k.o; // lower y = higher price
        const x = 14 + i * step;
        const top = Math.min(k.o, k.c);
        const h = Math.max(3, Math.abs(k.o - k.c));
        const cls = up ? "fill-accent stroke-accent" : "fill-danger stroke-danger";
        return (
          <g key={i} className={`candle ${cls}`} style={{ "--d": `${0.15 + i * 0.09}s` } as React.CSSProperties}>
            <line x1={x + 6} x2={x + 6} y1={k.h} y2={k.l} strokeWidth="1.5" />
            <rect x={x} y={top} width="12" height={h} stroke="none" />
          </g>
        );
      })}
      <path d={trend} pathLength={1} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="chart-line stroke-accent" opacity="0.9" />
    </svg>
  );
}
