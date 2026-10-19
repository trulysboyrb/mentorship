"use client";

import { useState } from "react";
import { inputCls, labelCls } from "@/components/ui";
import { positionSize } from "@/lib/riskCalc";

const PAIRS: { label: string; pipValue: number; note: string }[] = [
  { label: "EUR/USD, GBP/USD, AUD/USD (USD account)", pipValue: 10, note: "1 pip = $10 per lot" },
  { label: "XAU/USD Gold (USD account)", pipValue: 10, note: "1 pip (0.10) = $10 per lot" },
  { label: "USD/JPY (USD account, approx.)", pipValue: 6.7, note: "about $6.7 per lot, changes with price" },
  { label: "Other (type it below)", pipValue: 0, note: "" },
];

const num = (v: string) => (v.trim() === "" ? NaN : Number(v));
const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function RiskCalculator() {
  const [balance, setBalance] = useState("1000");
  const [risk, setRisk] = useState("1");
  const [stop, setStop] = useState("20");
  const [pair, setPair] = useState(0);
  const [custom, setCustom] = useState("10");
  const [rr, setRr] = useState("2");

  const pipValue = PAIRS[pair].pipValue || num(custom);
  const r = positionSize({
    balance: num(balance),
    riskPercent: num(risk),
    stopPips: num(stop),
    pipValuePerLot: pipValue,
    rewardRatio: num(rr),
  });

  return (
    <section className="mt-10">
      <h2 className="text-xs font-extrabold tracking-widest uppercase">Position size calculator</h2>
      <div className="mt-4 rounded-card border border-line bg-surface p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Account balance</label>
            <input className={inputCls} inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Risk per trade (%)</label>
            <input className={inputCls} inputMode="decimal" value={risk} onChange={(e) => setRisk(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Stop loss (pips)</label>
            <input className={inputCls} inputMode="decimal" value={stop} onChange={(e) => setStop(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Reward ratio (1 : ?)</label>
            <input className={inputCls} inputMode="decimal" value={rr} onChange={(e) => setRr(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Instrument</label>
            <select className={inputCls} value={pair} onChange={(e) => setPair(Number(e.target.value))}>
              {PAIRS.map((p, i) => (
                <option key={p.label} value={i}>{p.label}</option>
              ))}
            </select>
            {PAIRS[pair].note && <p className="mt-2 text-xs text-muted">{PAIRS[pair].note}</p>}
          </div>
          {PAIRS[pair].pipValue === 0 && (
            <div className="sm:col-span-2">
              <label className={labelCls}>Value of 1 pip for 1 lot (in your account currency)</label>
              <input className={inputCls} inputMode="decimal" value={custom} onChange={(e) => setCustom(e.target.value)} />
            </div>
          )}
        </div>

        <div className="mt-6 border-t border-line pt-5">
          {!r ? (
            <p className="text-sm text-muted">Fill in every box with a number above 0 to see the result.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  ["Lot size", r.lots.toFixed(2)],
                  ["Units", r.units.toLocaleString("en-US")],
                  ["Money at risk", money(r.actualRisk)],
                  ["Target profit", r.potentialProfit === null ? "-" : money(r.potentialProfit)],
                ].map(([l, v]) => (
                  <div key={l}>
                    <p className="text-[10px] font-extrabold tracking-widest text-muted uppercase">{l}</p>
                    <p className="mt-1 text-xl font-black">{v}</p>
                  </div>
                ))}
              </div>
              {r.tooSmall && (
                <p className="mt-4 text-sm text-danger">
                  Your risk is too small for even 0.01 lot at this stop loss. Widen the risk %, or use a smaller stop.
                </p>
              )}
              <p className="mt-4 text-xs text-muted">
                Lots are rounded down to 0.01 so you never risk more than planned (planned risk: {money(r.riskAmount)}).
                Check the pip value with your broker before trading real money.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
