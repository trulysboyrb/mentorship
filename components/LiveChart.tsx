"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_INTERVAL,
  DEFAULT_SYMBOL,
  INSTRUMENT_GROUPS,
  TIMEFRAMES,
  buildWidgetConfig,
  isKnownInterval,
  isKnownSymbol,
} from "@/lib/chartInstruments";

const STORE = "apex-chart-pref";

function currentTheme(): "dark" | "light" {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

// A live practice chart for the student area. Uses TradingView's free chart widget.
// It only loads when the student scrolls to it, to save mobile data.
export default function LiveChart() {
  const boxRef = useRef<HTMLDivElement>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [interval, setIntervalValue] = useState(DEFAULT_INTERVAL);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [expanded, setExpanded] = useState(false);
  const [group, setGroup] = useState(0);

  // Remember the last instrument and timeframe on this device (optional convenience).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const p = JSON.parse(raw) as { symbol?: unknown; interval?: unknown };
        if (isKnownSymbol(p.symbol)) {
          setSymbol(p.symbol);
          const g = INSTRUMENT_GROUPS.findIndex((x) => x.items.some((i) => i.symbol === p.symbol));
          if (g >= 0) setGroup(g);
        }
        if (isKnownInterval(p.interval)) setIntervalValue(p.interval);
      }
    } catch {
      // storage unavailable: fine
    }
    setTheme(currentTheme());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify({ symbol, interval }));
    } catch {
      // ignore
    }
  }, [symbol, interval]);

  // Follow the site's dark/light switch.
  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(currentTheme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  // Load only when it is on screen.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // (Re)build the chart whenever the instrument, timeframe or theme changes.
  useEffect(() => {
    const holder = holderRef.current;
    if (!visible || !holder) return;
    holder.innerHTML = "";

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.cssText = "height:100%;width:100%";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify(buildWidgetConfig(symbol, interval, theme));

    const wrap = document.createElement("div");
    wrap.className = "tradingview-widget-container";
    wrap.style.cssText = "height:100%;width:100%";
    wrap.appendChild(widget);
    wrap.appendChild(script);
    holder.appendChild(wrap);

    return () => {
      holder.innerHTML = "";
    };
  }, [visible, symbol, interval, theme]);

  // Lets the page behind stay still while the chart is full screen.
  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExpanded(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  const pill = (active: boolean) =>
    `shrink-0 rounded-control border px-3 py-1.5 text-xs font-semibold tracking-wider uppercase transition ${
      active ? "border-accent bg-accent text-black" : "border-line text-muted hover:border-accent hover:text-white"
    }`;

  return (
    <div
      ref={boxRef}
      className={
        expanded
          ? "fixed inset-0 z-50 flex flex-col bg-surface p-4"
          : "rounded-card border border-line bg-surface p-6"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xs font-extrabold tracking-widest uppercase">Practice chart (live)</h3>
        <button onClick={() => setExpanded((v) => !v)} className={pill(false)} aria-pressed={expanded}>
          {expanded ? "Close full screen" : "Full screen"}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">
        Switch instrument and timeframe, and use the tools on the left to draw lines and levels while you learn.
      </p>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Market type">
        {INSTRUMENT_GROUPS.map((g, i) => (
          <button key={g.name} role="tab" aria-selected={group === i} onClick={() => setGroup(i)} className={pill(group === i)}>
            {g.name}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {INSTRUMENT_GROUPS[group].items.map((it) => (
          <button key={it.symbol} onClick={() => setSymbol(it.symbol)} className={pill(symbol === it.symbol)} aria-pressed={symbol === it.symbol}>
            {it.label}
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
        <span className="shrink-0 text-[10px] font-semibold tracking-widest text-muted uppercase">Timeframe</span>
        {TIMEFRAMES.map((t) => (
          <button key={t.value} onClick={() => setIntervalValue(t.value)} className={pill(interval === t.value)} aria-pressed={interval === t.value}>
            {t.label}
          </button>
        ))}
      </div>

      <div
        className={`mt-4 overflow-hidden border border-line bg-black ${
          expanded ? "min-h-0 flex-1" : "h-[380px] md:h-[520px]"
        }`}
      >
        <div ref={holderRef} className="h-full w-full">
          {!visible && (
            <p className="flex h-full items-center justify-center text-xs text-muted">Chart loads as you scroll here...</p>
          )}
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        Charts are for learning only and are not trading advice. Some prices may be delayed. Chart by{" "}
        <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer nofollow" className="text-accent hover:underline">
          TradingView
        </a>
        .
      </p>
    </div>
  );
}
