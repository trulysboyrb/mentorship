"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function MaxDevicesForm({ current }: { current: number }) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const { error } = await createClient().rpc("set_max_devices", { p_n: value });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: error.message });
    setMsg({ ok: true, text: "Saved." });
    router.refresh();
  }

  return (
    <div className="mt-4 rounded-card border border-line bg-surface p-5">
      <p className="text-sm text-muted">
        How many devices can each student use at the same time? Admins are never limited.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setValue(n)}
            className={`h-11 w-11 rounded-control border text-sm font-bold ${
              value === n ? "border-accent text-accent" : "border-line text-muted hover:text-white"
            }`}
          >
            {n}
          </button>
        ))}
        <button
          onClick={save}
          disabled={busy || value === current}
          className="rounded-control bg-accent px-5 py-3 text-xs font-extrabold tracking-wider text-black uppercase disabled:opacity-40"
        >
          Save
        </button>
      </div>
      {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-accent" : "text-danger"}`}>{msg.text}</p>}
    </div>
  );
}
