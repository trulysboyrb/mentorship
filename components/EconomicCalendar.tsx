"use client";

import { useEffect, useRef } from "react";

// Free economic calendar widget from TradingView. It loads in the browser, so it needs the
// student to be online. If it ever fails to load, the link underneath still works.
export default function EconomicCalendar() {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.innerHTML = "";
    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    el.appendChild(inner);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: "dark",
      isTransparent: true,
      width: "100%",
      height: "600",
      locale: "en",
      importanceFilter: "0,1",
      currencyFilter: "USD,EUR,GBP,JPY,AUD,CAD,CHF,NZD",
    });
    el.appendChild(script);
    return () => {
      el.innerHTML = "";
    };
  }, []);

  return (
    <section className="mt-10">
      <h2 className="text-xs font-extrabold tracking-widest uppercase">Economic calendar</h2>
      <div className="mt-4 rounded-card border border-line bg-surface p-3">
        <div ref={box} className="tradingview-widget-container min-h-[200px]" />
        <p className="px-2 py-3 text-xs text-muted">
          Times shown in your device time zone. Calendar by{" "}
          <a href="https://www.tradingview.com/economic-calendar/" target="_blank" rel="noopener noreferrer"
            className="text-accent hover:underline">TradingView</a>
          . Not loading? Open it there directly.
        </p>
      </div>
    </section>
  );
}
