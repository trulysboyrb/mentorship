"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Switch, card, saveSettings, type Msg } from "@/components/SettingsBits";

export type CurrencyPreviewRow = { code: string; online: string; inPerson: string };

// Settings: show approximate prices in the visitor's currency, and a preview of what people will see.
export default function CurrencySettings({
  on,
  gmdPerUsd,
  liveRates,
  detected,
  preview,
}: {
  on: boolean;
  gmdPerUsd: number | null;
  liveRates: boolean;
  detected: string; // for example "US, shown in USD"
  preview: CurrencyPreviewRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  async function flip(next: boolean) {
    setMsg(null);
    setBusy(true);
    const err = await saveSettings({ local_prices_on: next ? "1" : "0" });
    setBusy(false);
    if (err) return setMsg({ ok: false, text: err });
    router.refresh();
  }

  return (
    <>
      <h3 className="mt-10 text-xs font-extrabold tracking-widest uppercase">Currencies</h3>
      <div className={card}>
        <p className="text-sm text-muted">
          Visitors in the Gambia see dalasi and can pay by Wave, card or crypto. Visitors in other countries see an
          approximate price in their own currency (unknown countries see US dollars). Their card and crypto payments
          are charged in US dollars, worked out from your dalasi-per-dollar rate below. Wave is hidden outside the Gambia.
        </p>
        <div className="mt-2">
          <Switch
            on={on}
            busy={busy}
            label="Show prices in the visitor's currency"
            desc="Switch off to show dalasi to everyone and charge cards in dalasi, exactly as before."
            warn={on && !gmdPerUsd ? "Set the dalasi-per-dollar rate (Crypto price section below). Until then everyone sees dalasi." : undefined}
            onChange={flip}
          />
        </div>
        {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-accent" : "text-danger"}`}>{msg.text}</p>}

        {gmdPerUsd ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="pb-2 text-left text-xs text-muted">
                What visitors see at D{gmdPerUsd} per US dollar ({liveRates ? "live exchange rates" : "built-in approximate rates, live rates unavailable"})
              </caption>
              <thead>
                <tr className="text-[11px] tracking-widest text-muted uppercase">
                  <th className="py-1.5 pr-4 font-semibold">Currency</th>
                  <th className="py-1.5 pr-4 font-semibold">Online</th>
                  <th className="py-1.5 font-semibold">In person</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r) => (
                  <tr key={r.code} className="border-t border-line">
                    <td className="py-1.5 pr-4 font-bold">{r.code}</td>
                    <td className="py-1.5 pr-4">{r.online}</td>
                    <td className="py-1.5">{r.inPerson}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <p className="mt-4 text-xs text-muted">
          Your own browser is currently detected as: <span className="text-white">{detected}</span>. To test, open the live site
          through a VPN in another country, or use the &quot;Prices in&quot; menu under the prices on the landing page.
          Country detection only works on the deployed site, not on localhost.
        </p>
      </div>
    </>
  );
}
