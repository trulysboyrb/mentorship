"use client";

import { useEffect, useRef, useState } from "react";
import CommandPalette from "@/components/CommandPalette";
import { createKonami } from "@/lib/konami";
import { fireConfetti } from "@/lib/confetti";
import { toggleGold } from "@/lib/gold";

// Site-wide extras: the Ctrl+K quick search, and a hidden surprise for people who know the code.
export default function Extras() {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const feed = createKonami(() => {
      const on = toggleGold();
      fireConfetti(on ? 180 : 80);
      setToast(on ? "Easter egg found! Gold mode is on. Enter the code again to turn it off." : "Gold mode is off.");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setToast(null), 5000);
    });
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      feed(e.key);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(timer.current);
    };
  }, []);

  return (
    <>
      <CommandPalette />
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex justify-center px-4">
          <div role="status" className="menu-pop max-w-sm border border-accent bg-surface px-5 py-4 text-center text-sm shadow-2xl">
            {toast}
          </div>
        </div>
      )}
    </>
  );
}
