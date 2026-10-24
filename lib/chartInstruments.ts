// The instruments students can switch between in the practice chart.
// To add or remove one, edit this list. "symbol" is the TradingView symbol (EXCHANGE:TICKER).
// Students can also type any other symbol inside the chart itself.

export type Instrument = { symbol: string; label: string };
export type InstrumentGroup = { name: string; items: Instrument[] };

export const INSTRUMENT_GROUPS: InstrumentGroup[] = [
  {
    name: "Forex",
    items: [
      { symbol: "FX:EURUSD", label: "EUR/USD" },
      { symbol: "FX:GBPUSD", label: "GBP/USD" },
      { symbol: "FX:USDJPY", label: "USD/JPY" },
      { symbol: "FX:USDCHF", label: "USD/CHF" },
      { symbol: "FX:AUDUSD", label: "AUD/USD" },
      { symbol: "FX:USDCAD", label: "USD/CAD" },
      { symbol: "FX:NZDUSD", label: "NZD/USD" },
      { symbol: "FX:GBPJPY", label: "GBP/JPY" },
    ],
  },
  {
    name: "Metals and oil",
    items: [
      { symbol: "OANDA:XAUUSD", label: "Gold" },
      { symbol: "OANDA:XAGUSD", label: "Silver" },
      { symbol: "TVC:USOIL", label: "US Oil" },
    ],
  },
  {
    name: "Crypto",
    items: [
      { symbol: "BINANCE:BTCUSDT", label: "Bitcoin" },
      { symbol: "BINANCE:ETHUSDT", label: "Ethereum" },
      { symbol: "BINANCE:SOLUSDT", label: "Solana" },
      { symbol: "BINANCE:BNBUSDT", label: "BNB" },
      { symbol: "BINANCE:XRPUSDT", label: "XRP" },
    ],
  },
  {
    name: "Indices",
    items: [
      { symbol: "TVC:DXY", label: "US Dollar Index" },
      { symbol: "FOREXCOM:SPXUSD", label: "S&P 500" },
      { symbol: "FOREXCOM:NSXUSD", label: "Nasdaq 100" },
    ],
  },
];

export const TIMEFRAMES: { value: string; label: string }[] = [
  { value: "5", label: "5m" },
  { value: "15", label: "15m" },
  { value: "60", label: "1H" },
  { value: "240", label: "4H" },
  { value: "D", label: "1D" },
];

export const DEFAULT_SYMBOL = "FX:EURUSD";
export const DEFAULT_INTERVAL = "60";

const SYMBOL_RE = /^[A-Z0-9_]{2,20}:[A-Z0-9._!-]{2,30}$/;

export function allSymbols(): string[] {
  return INSTRUMENT_GROUPS.flatMap((g) => g.items.map((i) => i.symbol));
}

export function isKnownSymbol(s: unknown): s is string {
  return typeof s === "string" && SYMBOL_RE.test(s) && allSymbols().includes(s);
}

export function isKnownInterval(v: unknown): v is string {
  return typeof v === "string" && TIMEFRAMES.some((t) => t.value === v);
}

// The settings passed to TradingView's free "Advanced Chart" widget.
export function buildWidgetConfig(symbol: string, interval: string, theme: "dark" | "light") {
  return {
    autosize: true,
    symbol,
    interval,
    timezone: "Etc/UTC",
    theme,
    style: "1", // candlesticks
    locale: "en",
    backgroundColor: theme === "dark" ? "#0a0a0a" : "#ffffff",
    gridColor: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    allow_symbol_change: true,
    hide_side_toolbar: false, // drawing tools: trend lines, support/resistance, fibonacci
    hide_top_toolbar: false,
    hide_legend: false,
    save_image: true,
    calendar: false,
    withdateranges: true,
    support_host: "https://www.tradingview.com",
  };
}
