"use client";

import { useState } from "react";
import { initialOf } from "@/lib/greeting";

// A round profile picture, falling back to the first letter of the name when there is no picture
// (or when the picture cannot be loaded).
export default function Avatar({
  url,
  name,
  size = 36,
  className = "",
}: {
  url: string | null | undefined;
  name: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const dim = { width: size, height: size };
  if (url && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        style={dim}
        onError={() => setFailed(true)}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      style={{ ...dim, fontSize: Math.round(size * 0.4) }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-surface font-black text-accent ${className}`}
      aria-hidden
    >
      {initialOf(name)}
    </span>
  );
}
