"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { gmdToUsd, formatUsd } from "@/lib/paymentMath";
import { inputCls, labelCls } from "@/components/ui";

export default function CryptoRateForm({
  current,
  priceOnline,
  priceInPerson,
}: {
  current: number | null;
  priceOnline: number;
  priceInPerson: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(current === null ? "" : String(current));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const n = Number(value);
  const valid = Number.isFinite(n) && n >= 1 && n <= 1000;

  async function save() {
    setBusy(true);
    setMsg(null);
    const { error } = await createClient().rpc("set_gmd_per_usd", { p_rate: n });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: error.message });
    setMsg({ ok: true, text: "Saved." });
    router.refresh();
  }

  return (
    <div className="mt-4 rounded-card border border-line bg-surface p-5">
      <p className="text-sm text-muted">
        Crypto is charged in US dollars. Enter how many dalasi equal 1 US dollar. The Crypto button stays hidden
        until you set this. Check it every so often so the rate stays fair.
      </p>
      <label className={`${labelCls} mt-4`} htmlFor="rate">
        Dalasi per 1 USD
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <input id="rate" inputMode="decimal" className={`${inputCls} max-w-[10rem]`} value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. 70" />
        <button
          onClick={save}
          disabled={busy || !valid}
          className="rounded-control bg-accent px-5 py-3 text-xs font-extrabold tracking-wider text-black uppercase disabled:opacity-40"
        >
          Save
        </button>
      </div>
      {valid && (
        <p className="mt-3 text-xs text-muted">
          At this rate: Online {formatUsd(gmdToUsd(priceOnline, n) ?? 0)}, In person {formatUsd(gmdToUsd(priceInPerson, n) ?? 0)} (before any referral discount).
        </p>
      )}
      {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-accent" : "text-danger"}`}>{msg.text}</p>}
    </div>
  );
}
