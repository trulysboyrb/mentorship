"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/config";

export type AdminPayout = {
  id: string;
  user_id: string;
  full_name: string;
  whatsapp: string | null;
  amount: number;
  payout_info: string;
  status: "requested" | "paid" | "rejected";
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
  rewarded_friends: number;
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const actionBtn =
  "rounded-control border px-3 py-1.5 text-xs font-extrabold tracking-wider uppercase disabled:opacity-50";

export default function PayoutManager({ items }: { items: AdminPayout[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const open = items.filter((i) => i.status === "requested");
  const done = items.filter((i) => i.status !== "requested");

  async function resolve(p: AdminPayout, status: "paid" | "rejected") {
    let note = "";
    if (status === "rejected") {
      const reason = window.prompt(`Why is this request not being paid? (the student will see this)`, "");
      if (reason === null) return;
      note = reason;
    } else {
      if (!window.confirm(`Mark D${p.amount.toLocaleString("en-US")} as paid to ${p.full_name}? Do this AFTER you have sent the money.`))
        return;
      note = window.prompt("Optional note for the student (for example the Wave reference):", "") ?? "";
    }
    setBusy(p.id);
    setError("");
    const { error } = await createClient().rpc("admin_resolve_payout", {
      p_id: p.id,
      p_status: status,
      p_note: note,
    });
    setBusy(null);
    if (error) setError(error.message);
    router.refresh();
  }

  const wa = (p: AdminPayout) =>
    p.whatsapp
      ? `https://wa.me/${p.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
          `Hi ${p.full_name}, your ${BRAND} referral payout of D${p.amount.toLocaleString("en-US")} has been sent to ${p.payout_info}.`
        )}`
      : null;

  return (
    <>
      {error && <p className="mt-4 break-words text-sm text-danger">{error}</p>}

      <h3 className="mt-8 text-xs font-extrabold tracking-widest uppercase">Waiting to be paid ({open.length})</h3>
      {open.length === 0 ? (
        <p className="mt-4 rounded-card border border-line bg-surface p-6 text-sm text-muted">Nobody is waiting. All caught up.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {open.map((p) => (
            <li key={p.id} className="rounded-card border border-danger bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{p.full_name}</p>
                  <p className="mt-1 text-xs text-muted" suppressHydrationWarning>
                    Asked on {fmt(p.created_at)} &middot; {p.rewarded_friends} friend{p.rewarded_friends === 1 ? "" : "s"} paid
                  </p>
                </div>
                <p className="text-2xl font-black text-accent">D{p.amount.toLocaleString("en-US")}</p>
              </div>
              <p className="mt-3 text-sm">
                <span className="text-muted">Send to: </span>
                <span className="font-semibold">{p.payout_info}</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  disabled={busy === p.id}
                  onClick={() => resolve(p, "paid")}
                  className={`${actionBtn} border-accent bg-accent text-black`}
                >
                  Mark as paid
                </button>
                <button
                  disabled={busy === p.id}
                  onClick={() => resolve(p, "rejected")}
                  className={`${actionBtn} border-line text-muted hover:border-danger hover:text-danger`}
                >
                  Reject
                </button>
                {wa(p) && (
                  <a href={wa(p)!} target="_blank" rel="noopener noreferrer"
                    className={`${actionBtn} border-line text-white hover:border-accent`}>
                    WhatsApp them
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-10 text-xs font-extrabold tracking-widest uppercase">History</h3>
      <div className="mt-4 overflow-x-auto rounded-card border border-line">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-[10px] tracking-widest text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Sent to</th>
              <th className="px-4 py-3">Result</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {done.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">{p.full_name}</td>
                <td className="px-4 py-3">D{p.amount.toLocaleString("en-US")}</td>
                <td className="px-4 py-3 text-muted">{p.payout_info}</td>
                <td className={`px-4 py-3 ${p.status === "paid" ? "text-accent" : "text-danger"}`}>
                  {p.status === "paid" ? "Paid" : "Rejected"}
                  {p.admin_note && <span className="block text-xs text-muted">{p.admin_note}</span>}
                </td>
                <td className="px-4 py-3 text-xs text-muted" suppressHydrationWarning>
                  {fmt(p.resolved_at ?? p.created_at)}
                </td>
              </tr>
            ))}
            {done.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">Nothing here yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
