"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { inputCls, labelCls } from "@/components/ui";

export default function PayoutSettingsForm({ reward, minPayout }: { reward: number; minPayout: number }) {
  const router = useRouter();
  const [r, setR] = useState(String(reward));
  const [m, setM] = useState(String(minPayout));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setMsg(null);
    const rn = Number(r);
    const mn = Number(m);
    if (!Number.isInteger(rn) || rn < 0) return setMsg({ ok: false, text: "Reward must be a whole number (0 or more)." });
    if (!Number.isInteger(mn) || mn < 1) return setMsg({ ok: false, text: "Minimum payout must be a whole number (1 or more)." });
    setBusy(true);
    const { error } = await createClient().rpc("set_payout_settings", { p_reward: rn, p_min: mn });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: error.message });
    setMsg({ ok: true, text: "Saved." });
    router.refresh();
  }

  return (
    <div className="mt-4 rounded-card border border-line bg-surface p-5">
      <p className="text-sm text-muted">
        What a student earns when a friend they referred is cleared, and the smallest amount they can
        cash out. Changing the reward only affects friends cleared from now on. Amounts are in dalasi.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="rw">Reward per paid friend (D)</label>
          <input id="rw" inputMode="numeric" className={inputCls} value={r} onChange={(e) => setR(e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="mp">Minimum payout (D)</label>
          <input id="mp" inputMode="numeric" className={inputCls} value={m} onChange={(e) => setM(e.target.value)} />
        </div>
      </div>
      <button
        onClick={save}
        disabled={busy || (r === String(reward) && m === String(minPayout))}
        className="mt-4 rounded-control bg-accent px-5 py-3 text-xs font-extrabold tracking-wider text-black uppercase disabled:opacity-40"
      >
        Save
      </button>
      {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-accent" : "text-danger"}`}>{msg.text}</p>}
    </div>
  );
}
