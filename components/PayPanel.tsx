"use client";

import { useState } from "react";

// The big Continue button on each payment page. Asks our server for a checkout page, then goes there.
export default function PayPanel({ method, bg, fg }: { method: string; bg: string; fg: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/pay/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method }),
      });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setError(json.error ?? "Something went wrong. Please try again.");
        setBusy(false);
        return;
      }
      window.location.href = json.url;
    } catch {
      setError("Could not reach the server. Check your internet and try again.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={go}
        disabled={busy}
        className="w-full rounded-control px-6 py-4 text-xs font-extrabold tracking-wider uppercase transition hover:brightness-110 disabled:opacity-60"
        style={{ background: bg, color: fg }}
      >
        {busy ? "Opening secure checkout..." : "Continue to payment"}
      </button>
      {error && (
        <p role="alert" className="mt-3 border border-danger p-3 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
