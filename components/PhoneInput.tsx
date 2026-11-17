"use client";

import { useState } from "react";
import { inputCls } from "@/components/ui";
import { DIAL_CODES, DEFAULT_ISO, dialFor, exampleFor, joinPhone, splitPhone } from "@/lib/dialCodes";

// WhatsApp number field: a country code picker ("NG +234") beside the number box.
// onChange gets the full number with its code ("+2348030000000"), or "" while the box is empty.
export default function PhoneInput({
  id,
  label,
  required,
  initial = "",
  onChange,
  onCountry,
}: {
  id?: string;
  label: string; // used for screen readers, e.g. "Person 2 WhatsApp number"
  required?: boolean;
  initial?: string; // a number saved earlier, so going back a step does not empty the box
  onChange: (full: string) => void;
  onCountry?: (name: string) => void;
}) {
  const start = splitPhone(initial);
  const [iso, setIso] = useState(initial ? start.iso : DEFAULT_ISO);
  const [national, setNational] = useState(initial ? start.national : "");
  const d = dialFor(iso);

  return (
    <div className="flex gap-3">
      {/* The native picker sits invisibly over a short "NG +234" label, so the list shows full country names. */}
      <div className="relative w-[7.75rem] shrink-0 focus-within:[&>div]:border-accent">
        <div className={`${inputCls} flex items-center justify-between gap-2 !px-3`} aria-hidden>
          <span className="whitespace-nowrap">
            {d.iso} +{d.dial}
          </span>
          <svg width="10" height="6" viewBox="0 0 10 6" className="shrink-0 text-muted" fill="currentColor">
            <path d="M0 0h10L5 6z" />
          </svg>
        </div>
        <select
          aria-label={`${label}: country code`}
          value={iso}
          onChange={(e) => {
            const next = e.target.value;
            setIso(next);
            onChange(joinPhone(next, national));
            onCountry?.(dialFor(next).name);
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        >
          {DIAL_CODES.map((c) => (
            <option key={c.iso} value={c.iso}>
              {c.name} (+{c.dial})
            </option>
          ))}
        </select>
      </div>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        required={required}
        aria-label={`${label}: number`}
        className={inputCls}
        placeholder={exampleFor(iso)}
        value={national}
        onChange={(e) => {
          const v = e.target.value.replace(/[^\d ]/g, "");
          setNational(v);
          onChange(joinPhone(iso, v));
        }}
      />
    </div>
  );
}
