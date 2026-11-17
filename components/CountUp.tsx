"use client";

import { useLayoutEffect, useRef } from "react";
import { easeOutCubic, formatCount, parseCount } from "@/lib/countup";

// Shows a number that counts up when it first appears and when it changes.
// The server renders the final value, so nothing breaks without JavaScript.
export default function CountUp({ value, ms = 900 }: { value: string | number; ms?: number }) {
  const text = String(value);
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);

  useLayoutEffect(() => {
    const el = ref.current;
    const p = parseCount(text);
    if (!el || !p) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      prev.current = p.n;
      return;
    }
    const from = prev.current;
    const to = p.n;
    if (from === to) return;
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const cur = from + (to - from) * easeOutCubic(t);
      el.textContent = `${p.prefix}${formatCount(cur, p.commas)}${p.suffix}`;
      if (t < 1) raf = requestAnimationFrame(step);
      else prev.current = to;
    };
    el.textContent = `${p.prefix}${formatCount(from, p.commas)}${p.suffix}`;
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      el.textContent = text;
      prev.current = to;
    };
  }, [text, ms]);

  return <span ref={ref}>{text}</span>;
}
