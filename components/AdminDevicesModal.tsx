"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Device = { id: string; label: string; first_seen: string; last_seen: string };

const smallBtn =
  "rounded-control border border-line px-3 py-1.5 text-xs font-semibold tracking-wider text-muted uppercase hover:border-accent hover:text-white disabled:opacity-40";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function AdminDevicesModal({
  student,
  onClose,
}: {
  student: { id: string; full_name: string };
  onClose: () => void;
}) {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await createClient().rpc("admin_list_devices", { p_user: student.id });
    if (error) setError(error.message);
    else setDevices((data ?? []) as Device[]);
  }, [student.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function reset() {
    if (!window.confirm(`Reset all devices for ${student.full_name}? They will re-register on next login.`))
      return;
    setBusy(true);
    setError("");
    const { error } = await createClient().rpc("admin_reset_devices", { p_user: student.id });
    setBusy(false);
    if (error) return setError(error.message);
    load();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card border border-line bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black tracking-tight">Devices</h3>
            <p className="mt-1 text-sm text-muted">{student.full_name}</p>
          </div>
          <button onClick={onClose} className={smallBtn}>Close</button>
        </div>

        {error && <p className="mt-4 break-words text-sm text-danger">{error}</p>}

        <ul className="mt-6 space-y-2">
          {devices === null && !error && <li className="text-sm text-muted">Loading…</li>}
          {devices?.length === 0 && <li className="text-sm text-muted">No devices registered yet.</li>}
          {devices?.map((d) => (
            <li key={d.id} className="border border-line bg-surface-2 px-4 py-3 text-sm">
              <p>{d.label}</p>
              <p className="mt-1 text-xs text-muted" suppressHydrationWarning>
                First seen {fmt(d.first_seen)} &middot; Last seen {fmt(d.last_seen)}
              </p>
            </li>
          ))}
        </ul>

        <button
          onClick={reset}
          disabled={busy || !devices?.length}
          className="mt-6 rounded-control border border-danger px-5 py-2.5 text-xs font-extrabold tracking-wider text-danger uppercase disabled:opacity-40"
        >
          Reset all devices
        </button>
        <p className="mt-3 text-xs text-muted">
          Use this when a student loses a phone or changes laptop. Their slots are freed straight away.
        </p>
      </div>
    </div>
  );
}
