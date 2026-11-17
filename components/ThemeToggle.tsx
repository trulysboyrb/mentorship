"use client";

import { useEffect, useState } from "react";
import { THEME_KEY, isTheme, type Theme } from "@/lib/theme";

// Dark / light switch. variant "menu" fits inside the account menu, "icon" is a small
// round button for pages that have no menu (landing, login).
export default function ThemeToggle({ variant = "icon" }: { variant?: "icon" | "menu" }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(isTheme(current) ? current : "dark");
  }, []);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* private mode: the choice just lasts until the page is closed */
    }
    setTheme(next);
  }

  const label = theme === "light" ? "Switch to dark mode" : "Switch to light mode";

  if (variant === "menu") {
    return (
      <button
        type="button"
        role="menuitem"
        onClick={toggle}
        className="block w-full px-4 py-2.5 text-left text-sm text-white/80 hover:bg-surface-2 hover:text-white"
      >
        {theme === "light" ? "Dark mode" : "Light mode"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted hover:border-accent hover:text-white"
    >
      {theme === "light" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )}
    </button>
  );
}
