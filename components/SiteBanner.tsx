"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { bannerVisible, parseSiteStatus, type BannerTone } from "@/lib/siteSettings";

const TONES: Record<BannerTone, string> = {
  info: "border-b border-line bg-surface-2 text-white",
  success: "border-b border-accent/50 bg-accent/10 text-accent",
  warning: "border-b border-danger/50 bg-danger/10 text-danger",
};

// A message the admin sets in Settings. Shown at the top of the student pages. Checked again when
// the student changes page, comes back to the tab, and once every 2 minutes, so a new message appears
// without a refresh.
export default function SiteBanner({
  initialOn,
  initialText,
  initialTone,
}: {
  initialOn: boolean;
  initialText: string;
  initialTone: BannerTone;
}) {
  const pathname = usePathname() ?? "/";
  const [s, setS] = useState({ on: initialOn, text: initialText, tone: initialTone });

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const { data } = await createClient().rpc("site_status");
        if (!alive) return;
        const r = parseSiteStatus(data);
        setS({ on: r.banner_on, text: r.banner_text, tone: r.banner_tone });
      } catch {
        /* keep what we have */
      }
    };
    check();
    const id = setInterval(check, 120_000);
    const onVis = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pathname]);

  const show = bannerVisible(
    { ...parseSiteStatus(null), banner_on: s.on, banner_text: s.text, banner_tone: s.tone },
    pathname
  );
  if (!show) return null;

  return (
    <div role="status" className={`px-4 py-2 text-center text-xs font-bold ${TONES[s.tone]}`} data-testid="site-banner">
      {s.text}
    </div>
  );
}
