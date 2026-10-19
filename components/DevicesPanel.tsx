"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { removeDevice } from "@/app/profile/actions";

export type DeviceItem = {
  id: string;
  label: string;
  first_seen: string;
  last_seen: string;
  is_current: boolean;
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function DevicesPanel({
  devices,
  max,
}: {
  devices: DeviceItem[];
  max: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function remove(d: DeviceItem) {
    if (!window.confirm(`Remove "${d.label}"? It will need a free slot to log in again.`)) return;
    setBusy(d.id);
    setError("");
    const res = await removeDevice(d.id);
    setBusy(null);
    if (res.error) setError(res.error);
    router.refresh();
  }

  return (
    <section className="mt-10">
      <h2 className="text-xs font-extrabold tracking-widest uppercase">Your devices</h2>
      <div className="mt-4 rounded-card border border-line bg-surface p-5">
        <p className="text-sm text-muted">
          Your account works on up to {max} device{max === 1 ? "" : "s"} ({devices.length} in use).
          Each browser counts as its own device. Do not share your login.
        </p>

        <ul className="mt-4 space-y-2">
          {devices.length === 0 && <li className="text-sm text-muted">No devices yet.</li>}
          {devices.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 border border-line bg-surface-2 px-4 py-3 text-sm"
            >
              <div>
                <p>
                  {d.label}
                  {d.is_current && (
                    <span className="ml-3 text-[10px] font-extrabold tracking-widest text-accent uppercase">
                      This device
                    </span>
                  )}
                </p>
                <p className="mt-1 text-[11px] text-muted" suppressHydrationWarning>
                  Added {fmt(d.first_seen)} &middot; last used {fmt(d.last_seen)}
                </p>
              </div>
              {!d.is_current && (
                <button
                  disabled={busy === d.id}
                  onClick={() => remove(d)}
                  className="rounded-control border border-line px-3 py-1.5 text-xs font-semibold tracking-wider text-muted uppercase hover:border-danger hover:text-danger disabled:opacity-40"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>

        {error && <p className="mt-3 break-words text-sm text-danger">{error}</p>}
        <p className="mt-4 text-[11px] text-muted">
          You can remove one device every 7 days. If you lose a device, message us and we will
          reset them for you.
        </p>
      </div>
    </section>
  );
}
