"use client";

import { useState } from "react";

// Holds the open/closed state of the sidebar menu on small screens.
export default function DashboardShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen lg:flex">
      <div className="flex items-center justify-between border-b border-line px-4 py-3 lg:hidden">
        <span className="font-black text-accent">APEXTRADE ACADEMY</span>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-control border border-line px-3 py-1.5 text-xs font-semibold tracking-wider uppercase"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      <aside
        className={`${open ? "block" : "hidden"} w-full shrink-0 border-r border-line bg-black/40 lg:block lg:h-screen lg:w-80 lg:overflow-y-auto`}
        onClick={() => setOpen(false)}
      >
        {sidebar}
      </aside>

      <div className="min-w-0 flex-1 lg:h-screen lg:overflow-y-auto">{children}</div>
    </div>
  );
}
