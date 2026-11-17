"use client";

// Opens the quick-search palette (same as pressing Ctrl+K).
export default function PaletteButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("apex:palette"))}
      className="flex items-center gap-2 border border-line px-3 py-1.5 text-xs text-muted transition hover:border-accent hover:text-white"
      aria-label="Quick search"
    >
      Search
      <kbd className="hidden border border-line px-1.5 text-[10px] sm:inline">Ctrl K</kbd>
    </button>
  );
}
