"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearChoice, loginShouldEnd } from "@/lib/keepSignedIn";

// Signs the person out when they chose not to stay signed in and have closed their browser since.
export default function SessionGuard() {
  const router = useRouter();
  useEffect(() => {
    if (!loginShouldEnd()) return;
    (async () => {
      await createClient().auth.signOut();
      clearChoice();
      router.refresh();
    })();
  }, [router]);
  return null;
}
