"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Re-checks the page every few seconds. A safety net in case the live update is missed.
export default function PollRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
