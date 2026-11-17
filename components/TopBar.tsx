"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { firstNameOf, greetingFor } from "@/lib/greeting";
import Avatar from "@/components/Avatar";
import { useInstall } from "@/components/useInstall";
import ThemeToggle from "@/components/ThemeToggle";

const itemCls =
  "block w-full px-4 py-2.5 text-left text-sm text-white/80 hover:bg-surface-2 hover:text-white";

// Top strip of the student area: greeting (from the device clock) and a profile circle
// that opens the account menu.
export default function TopBar({
  fullName,
  isAdmin,
  showTools,
  left,
  avatarUrl,
}: {
  fullName: string;
  avatarUrl?: string | null;
  isAdmin: boolean;
  showTools: boolean;
  left?: React.ReactNode;
}) {
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [greeting, setGreeting] = useState<string | null>(null);
  const { canPrompt, ios, install } = useInstall();

  useEffect(() => {
    const tick = () => setGreeting(greetingFor(new Date()));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    setOpen(false);
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const close = () => setOpen(false);

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-line bg-bg/80 px-4 py-3 backdrop-blur sm:px-6">
      <div className="min-w-0 text-xs">{left}</div>

      <div ref={wrap} className="relative flex items-center gap-3">
        <p className="max-w-[10.5rem] truncate text-sm sm:max-w-xs">
          <span className={greeting ? "text-white/70" : "invisible"}>
            {greeting ?? "Welcome"}
          </span>
          <span className="text-white/70">, </span>
          <span className="font-bold">{firstNameOf(fullName)}</span>
        </p>

        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Account menu"
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 rounded-full border border-accent transition hover:brightness-125"
        >
          <Avatar url={avatarUrl} name={fullName} size={34} />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute top-full right-0 mt-3 w-56 border border-line bg-surface py-1 shadow-2xl"
          >
            <Link role="menuitem" href="/profile" onClick={close} className={itemCls}>
              Profile
            </Link>
            {showTools && (
              <Link role="menuitem" href="/classes" onClick={close} className={itemCls}>
                Live classes
              </Link>
            )}
            {showTools && (
              <Link role="menuitem" href="/tools" onClick={close} className={itemCls}>
                Market tools
              </Link>
            )}
            {isAdmin && (
              <Link role="menuitem" href="/admin" onClick={close} className={itemCls}>
                Admin area
              </Link>
            )}
            {canPrompt ? (
              <button
                role="menuitem"
                onClick={() => {
                  close();
                  install();
                }}
                className={itemCls}
              >
                Install app
              </button>
            ) : (
              ios && (
                <Link role="menuitem" href="/profile#install" onClick={close} className={itemCls}>
                  Install app
                </Link>
              )
            )}
            <button
              role="menuitem"
              onClick={() => {
                close();
                window.dispatchEvent(new Event("apex:palette"));
              }}
              className={`${itemCls} flex items-center justify-between`}
            >
              Quick search
              <kbd className="border border-line px-1.5 text-[10px] text-muted">Ctrl K</kbd>
            </button>
            <ThemeToggle variant="menu" />
            <button role="menuitem" onClick={signOut} className={`${itemCls} border-t border-line`}>
              Log out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
