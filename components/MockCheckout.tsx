"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MockCheckout({ payment }: { payment: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function finish(result: "paid" | "fail") {
    setBusy(true);
    const res = await fetch("/api/pay/mock-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment, result }),
    });
    const json = (await res.json().catch(() => ({}))) as { outcome?: string; error?: string };
    if (!res.ok) {
      setMsg(json.error ?? "Failed");
      setBusy(false);
      return;
    }
    router.push(`/pay/return?p=${payment}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm border border-danger bg-surface p-8 text-center">
        <p className="text-[10px] font-extrabold tracking-widest text-danger uppercase">Test mode</p>
        <h1 className="mt-2 text-xl font-black">Fake payment page</h1>
        <p className="mt-2 text-xs text-muted">No real money moves. This pretends to be the payment company.</p>
        <button disabled={busy} onClick={() => finish("paid")} className="mt-6 w-full bg-accent px-4 py-3 text-xs font-extrabold tracking-wider text-black uppercase disabled:opacity-50">
          Simulate successful payment
        </button>
        <button disabled={busy} onClick={() => finish("fail")} className="mt-3 w-full border border-line px-4 py-3 text-xs font-extrabold tracking-wider uppercase disabled:opacity-50">
          Simulate failed payment
        </button>
        {msg && <p className="mt-3 text-xs text-danger">{msg}</p>}
      </div>
    </main>
  );
}
