"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { canRequestPayout, payoutHint, payoutStatusLabel, type Earnings, type PayoutRow } from "@/lib/earnings";
import { REFERRAL_DISCOUNT_PERCENT } from "@/lib/pricing";
import { referralLink, referralShareText } from "@/lib/referral";

export default function ReferralPanel({
  code,
  active,
  total,
  paid,
  usedCode,
  earnings,
  payouts,
}: {
  code: string;
  active: boolean;
  total: number;
  paid: number;
  usedCode: boolean;
  earnings: Earnings | null;
  payouts: PayoutRow[];
}) {
  const router = useRouter();
  const [info, setInfo] = useState("");
  const [payBusy, setPayBusy] = useState(false);
  const [payMsg, setPayMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function requestPayout() {
    setPayBusy(true);
    setPayMsg(null);
    const { error } = await createClient().rpc("request_payout", { p_info: info });
    setPayBusy(false);
    if (error) return setPayMsg({ ok: false, text: error.message });
    setInfo("");
    setPayMsg({ ok: true, text: "Request sent. We have been alerted and will pay you soon." });
    router.refresh();
  }

  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  useEffect(() => setOrigin(window.location.origin), []);

  async function copy(text: string, which: "code" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      window.prompt("Copy this:", text);
    }
  }

  const link = origin ? referralLink(origin, code) : "";
  const wa = origin
    ? `https://wa.me/?text=${encodeURIComponent(referralShareText(origin, code))}`
    : "#";

  const btn =
    "rounded-control border border-line px-4 py-2 text-xs font-semibold tracking-wider text-white uppercase hover:border-accent disabled:opacity-40";

  return (
    <section className="mt-10">
      <h2 className="text-xs font-extrabold tracking-widest uppercase">Refer a friend</h2>
      <div className="mt-4 rounded-card border border-line bg-surface p-5">
        <p className="text-sm text-muted">
          Friends who join with your code get {REFERRAL_DISCOUNT_PERCENT}% off their course.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="border border-line bg-black px-4 py-2 font-mono text-lg font-bold tracking-widest">
            {code}
          </span>
          <button className={btn} onClick={() => copy(code, "code")}>
            {copied === "code" ? "Copied" : "Copy code"}
          </button>
          <button className={btn} disabled={!link} onClick={() => copy(link, "link")}>
            {copied === "link" ? "Copied" : "Copy link"}
          </button>
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-control bg-accent px-4 py-2 text-xs font-extrabold tracking-wider text-black uppercase"
          >
            Share on WhatsApp
          </a>
        </div>

        {!active && (
          <p className="mt-4 text-xs text-danger">
            Your code starts working once your payment is confirmed.
          </p>
        )}

        <p className="mt-4 text-xs text-muted">
          Friends joined: <span className="text-white">{total}</span> &middot; of them paid:{" "}
          <span className="text-white">{paid}</span>
        </p>
        {usedCode && (
          <p className="mt-2 text-xs text-accent">
            You joined with a referral code, so your {REFERRAL_DISCOUNT_PERCENT}% discount applies.
          </p>
        )}

        {earnings && (
          <div className="mt-6 border-t border-line pt-5">
            <h3 className="text-[10px] font-extrabold tracking-widest text-accent uppercase">Your earnings</h3>
            <p className="mt-2 text-xs text-muted">
              You earn D{earnings.reward.toLocaleString("en-US")} each time a friend who joined with
              your code is cleared.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ["Earned", earnings.earned],
                ["Paid out", earnings.paid],
                ["Waiting", earnings.pending],
                ["Available", earnings.available],
              ].map(([l, v]) => (
                <div key={l as string}>
                  <p className="text-[10px] font-extrabold tracking-widest text-muted uppercase">{l}</p>
                  <p className={`mt-1 text-xl font-black ${l === "Available" ? "text-accent" : ""}`}>
                    D{(v as number).toLocaleString("en-US")}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-muted">{payoutHint(earnings)}</p>

            {canRequestPayout(earnings) && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <input
                  value={info}
                  onChange={(e) => setInfo(e.target.value)}
                  maxLength={200}
                  placeholder="Where to send it, e.g. Wave 301 2345"
                  className="min-w-0 flex-1 rounded-control border border-line bg-black px-4 py-3 text-sm text-white placeholder:text-muted/70 focus:border-accent focus:outline-none"
                />
                <button
                  onClick={requestPayout}
                  disabled={payBusy || info.trim().length < 3}
                  className="rounded-control bg-accent px-5 py-3 text-xs font-extrabold tracking-wider text-black uppercase disabled:opacity-50"
                >
                  {payBusy ? "Sending…" : `Request payout of D${earnings.available.toLocaleString("en-US")}`}
                </button>
              </div>
            )}
            {payMsg && (
              <p className={`mt-3 break-words text-sm ${payMsg.ok ? "text-accent" : "text-danger"}`}>{payMsg.text}</p>
            )}

            {payouts.length > 0 && (
              <ul className="mt-5 space-y-2">
                {payouts.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border border-line bg-surface-2 px-4 py-3 text-xs">
                    <span>
                      D{p.amount.toLocaleString("en-US")} &middot;{" "}
                      <span suppressHydrationWarning>
                        {new Date(p.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </span>
                    <span
                      className={`font-extrabold tracking-widest uppercase ${
                        p.status === "paid" ? "text-accent" : p.status === "rejected" ? "text-danger" : "text-muted"
                      }`}
                    >
                      {payoutStatusLabel(p.status)}
                    </span>
                    {p.admin_note && <span className="w-full text-muted">Note from us: {p.admin_note}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
