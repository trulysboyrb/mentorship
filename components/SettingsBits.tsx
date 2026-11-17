"use client";

import { createClient } from "@/lib/supabase/client";

export type Msg = { ok: boolean; text: string } | null;

export const card = "mt-4 rounded-card border border-line bg-surface p-5";
export const saveBtn =
  "rounded-control bg-accent px-5 py-3 text-xs font-extrabold tracking-wider text-black uppercase disabled:opacity-40";
export const ghostBtn =
  "rounded-control border border-line px-4 py-2.5 text-xs font-extrabold tracking-wider uppercase hover:border-accent disabled:opacity-40";

// Saves settings through the admin-only database function. Returns an error message or null.
export async function saveSettings(patch: Record<string, string>): Promise<string | null> {
  const { error } = await createClient().rpc("admin_save_site_settings", { p: patch });
  return error ? error.message : null;
}

export function Switch({
  on,
  busy,
  label,
  desc,
  warn,
  onChange,
}: {
  on: boolean;
  busy: boolean;
  label: string;
  desc?: string;
  warn?: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        {desc && <p className="mt-0.5 text-xs text-muted">{desc}</p>}
        {warn && <p className="mt-0.5 text-xs text-danger">{warn}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={busy}
        onClick={() => onChange(!on)}
        className={`relative h-7 w-12 shrink-0 border transition-colors disabled:opacity-50 ${
          on ? "border-accent bg-accent/20" : "border-line bg-surface-2"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 transition-all ${on ? "left-[1.35rem] bg-accent" : "left-0.5 bg-muted"}`}
        />
      </button>
    </div>
  );
}
