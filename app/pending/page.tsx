import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { WHATSAPP_NUMBER, BRAND } from "@/lib/config";
import AuthCard from "@/components/AuthCard";

export default async function PendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, learning_mode")
    .eq("id", user!.id)
    .single();

  const mode = profile?.learning_mode === "in_person" ? "in person" : "online";
  const message = `Hi, I just signed up on ${BRAND} as ${profile?.full_name} (${user!.email}). I want to learn ${mode} and I'm ready to pay.`;
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  return (
    <AuthCard title="Account created" subtitle="Complete your payment to unlock courses">
      <p className="text-center text-sm text-muted">
        Message us on WhatsApp to arrange payment. Once we confirm it, your
        courses unlock automatically.
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 block rounded-control bg-accent px-6 py-3.5 text-center text-xs font-extrabold tracking-wider text-black uppercase"
      >
        Continue on WhatsApp
      </a>
      <Link
        href="/dashboard"
        className="mt-5 block text-center text-xs text-muted hover:text-white"
      >
        Skip for now, go to my dashboard
      </Link>
    </AuthCard>
  );
}
