"use client";

import { useEffect, useState } from "react";
import { REFERRAL_DISCOUNT_PERCENT } from "@/lib/pricing";
import { referralLink, referralShareText } from "@/lib/referral";

export default function ReferralPanel({
  code,
  active,
  total,
  paid,
  usedCode,
}: {
  code: string;
  active: boolean;
  total: number;
  paid: number;
  usedCode: boolean;
}) {
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
      </div>
    </section>
  );
}
