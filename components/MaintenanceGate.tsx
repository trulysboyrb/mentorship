"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isStudentArea, parseSiteStatus } from "@/lib/siteSettings";

// Maintenance mode. While it is on, students see the student pages blurred with a message on top.
// Admins are never blocked (they see a small reminder instead). Login, signup, legal pages and the
// admin area are never covered, so you can always get in to switch it off again.
export default function MaintenanceGate({
  initialMaintenance,
  initialIsAdmin,
}: {
  initialMaintenance: boolean;
  initialIsAdmin: boolean;
}) {
  const pathname = usePathname() ?? "/";
  const [maintenance, setMaintenance] = useState(initialMaintenance);
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin);

  // Layouts are not re-run when someone clicks around, so re-check on every page change, when the tab
  // comes back into view, and once a minute.
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const { data } = await createClient().rpc("site_status");
        if (!alive) return;
        const s = parseSiteStatus(data);
        setMaintenance(s.maintenance);
        setIsAdmin(s.is_admin);
      } catch {
        /* keep the last known state */
      }
    };
    check();
    const id = setInterval(check, 60_000);
    const onVis = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pathname]);

  const blocked = maintenance && !isAdmin && isStudentArea(pathname);

  // While the cover is up, the page behind it can not be scrolled or tabbed into.
  useEffect(() => {
    const content = document.getElementById("app-content");
    if (!blocked) return;
    document.body.style.overflow = "hidden";
    content?.setAttribute("inert", "");
    return () => {
      document.body.style.overflow = "";
      content?.removeAttribute("inert");
    };
  }, [blocked]);

  if (maintenance && isAdmin) {
    return (
      <Link
        href="/admin/settings"
        className="fixed bottom-4 left-4 z-[80] border border-danger bg-surface px-3 py-2 text-[11px] font-bold text-danger shadow-2xl"
      >
        Maintenance mode is ON. Students see the maintenance page. Click to change.
      </Link>
    );
  }

  if (!blocked) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="maint-title"
      className="fade-quick fixed inset-0 z-[90] flex items-center justify-center bg-bg/60 p-6 backdrop-blur-xl"
    >
      <div className="menu-pop w-full max-w-md border border-line bg-surface p-8 text-center shadow-2xl sm:p-10">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="mx-auto text-accent" aria-hidden>
          <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6z" />
        </svg>
        <h1 id="maint-title" className="mt-5 text-2xl font-black tracking-tight">
          We&apos;re Currently On Maintenance, Come Back Soon
        </h1>
        <p className="mt-3 text-sm text-muted">We are making things better. Your progress and payments are safe.</p>
        <Link href="/" className="mt-6 inline-block text-xs text-accent hover:underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}
