"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

// Listens for database changes and re-fetches the current page's data.
export default function RealtimeRefresh({
  table = "profiles",
  filter,
}: {
  table?: string;
  filter?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    async function start() {
      // Attach the login token BEFORE subscribing, otherwise RLS hides every event.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel(`rt-${table}-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table, ...(filter ? { filter } : {}) },
          (payload) => {
            console.log("[realtime] change:", payload.eventType);
            router.refresh();
          }
        )
        .subscribe((status, err) =>
          console.log("[realtime] status:", status, err ?? "")
        );
    }
    start();

    // Safety net: also refresh when the person comes back to this tab.
    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      if (channel) supabase.removeChannel(channel);
    };
  }, [table, filter, router]);

  return null;
}
