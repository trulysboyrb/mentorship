"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className="rounded-control border border-line px-4 py-2 text-xs font-semibold tracking-wider text-muted uppercase hover:border-accent hover:text-white"
    >
      Log out
    </button>
  );
}
