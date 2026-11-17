"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export type MenuItem = {
  key: string;
  label: string;
  onClick: () => void;
  tone?: "default" | "accent" | "danger";
  badge?: string | number;
  hint?: string;
  disabled?: boolean;
  dividerBefore?: boolean;
};

const MENU_W = 240;

// An "Options" button that opens a menu of actions. The menu is positioned on the screen
// (not inside the table) so a scrolling table can never cut it off.
export default function OptionsMenu({
  items,
  label = "Options",
  busy = false,
}: {
  items: MenuItem[];
  label?: string;
  busy?: boolean;
}) {
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const close = useCallback((refocus = false) => {
    setOpen(false);
    setPos(null);
    if (refocus) btn.current?.focus();
  }, []);

  // Place the menu under the button, right edges lined up; flip above if there is no room.
  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const h = menu.current?.offsetHeight ?? 0;
    const left = Math.min(Math.max(8, r.right - MENU_W), window.innerWidth - MENU_W - 8);
    const below = r.bottom + 6;
    const top = below + h > window.innerHeight - 8 && r.top - h - 6 > 8 ? r.top - h - 6 : below;
    setPos({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus();
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (menu.current?.contains(t) || btn.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const els = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? []);
        if (els.length === 0) return;
        const i = els.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.key === "ArrowDown" ? (i + 1) % els.length : (i - 1 + els.length) % els.length;
        els[next].focus();
      }
    };
    const onAway = () => close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onAway, true);
    window.addEventListener("resize", onAway);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onAway, true);
      window.removeEventListener("resize", onAway);
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={() => (open ? close() : setOpen(true))}
        className={`inline-flex items-center gap-2 rounded-control border px-4 py-2 text-xs font-extrabold tracking-wider uppercase transition disabled:opacity-50 ${
          open ? "border-accent text-white" : "border-line text-white hover:border-accent"
        }`}
      >
        {busy ? "Working..." : label}
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </button>

      {open && (
        <div
          ref={menu}
          role="menu"
          style={{
            position: "fixed",
            top: pos?.top ?? -9999,
            left: pos?.left ?? -9999,
            width: MENU_W,
            visibility: pos ? "visible" : "hidden",
          }}
          className="menu-pop z-50 border border-line bg-surface py-1 shadow-2xl"
        >
          {items.map((it) => (
            <div key={it.key}>
              {it.dividerBefore && <div className="my-1 border-t border-line" />}
              <button
                role="menuitem"
                type="button"
                disabled={it.disabled}
                onClick={() => {
                  close();
                  it.onClick();
                }}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors disabled:opacity-40 ${
                  it.tone === "danger"
                    ? "text-white/80 hover:bg-danger/10 hover:text-danger focus:bg-danger/10 focus:text-danger"
                    : it.tone === "accent"
                      ? "font-bold text-accent hover:bg-accent/10 focus:bg-accent/10"
                      : "text-white/80 hover:bg-surface-2 hover:text-white focus:bg-surface-2 focus:text-white"
                } focus:outline-none`}
              >
                <span className="min-w-0">
                  {it.label}
                  {it.hint && <span className="block text-[11px] font-normal text-muted">{it.hint}</span>}
                </span>
                {it.badge !== undefined && it.badge !== 0 && (
                  <span className="shrink-0 text-xs font-bold text-accent">({it.badge})</span>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
