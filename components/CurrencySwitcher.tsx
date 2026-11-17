"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "@/lib/currency";

const COOKIE = "apex_cur";

// "Prices shown in: [US dollars]". Detected from the visitor's country; they can change it.
// Choosing "Automatic" removes the saved choice.
export default function CurrencySwitcher({
  code,
  country,
  source,
  className = "",
}: {
  code: CurrencyCode;
  country: string | null;
  source: "chosen" | "country" | "default";
  className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState<string>(source === "chosen" ? code : "auto");

  function change(next: string) {
    setValue(next);
    try {
      document.cookie =
        next === "auto"
          ? `${COOKIE}=; path=/; max-age=0; samesite=lax`
          : `${COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* cookies blocked: nothing to save */
    }
    router.refresh();
  }

  return (
    <label className={`inline-flex items-center gap-2 text-xs text-muted ${className}`}>
      <span>Prices in</span>
      <select
        value={value}
        onChange={(e) => change(e.target.value)}
        aria-label="Currency"
        className="rounded-control border border-line bg-black px-2 py-1.5 text-xs text-white focus:border-accent focus:outline-none"
      >
        <option value="auto">
          Automatic ({code}
          {country ? `, ${country}` : ""})
        </option>
        {SUPPORTED_CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}
