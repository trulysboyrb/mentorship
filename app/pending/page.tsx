import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { whatsappLink } from "@/lib/whatsapp";
import { REFERRAL_DISCOUNT_PERCENT, formatGMD, priceFor } from "@/lib/pricing";
import AuthCard from "@/components/AuthCard";

export default async function PendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, learning_mode, referral_discount")
    .eq("id", user!.id)
    .single();

  const referred = !!profile?.referral_discount;
  const price = priceFor(profile?.learning_mode, referred);
  const href = whatsappLink(
    profile?.full_name ?? "",
    user!.email ?? "",
    profile?.learning_mode ?? null,
    { referred }
  );

  return (
    <AuthCard title="Account created" subtitle="Complete your payment to unlock courses">
      <p className="text-center text-sm text-muted">
        Message us on WhatsApp to arrange payment. Once we confirm it, your
        courses unlock automatically.
      </p>

      <div className="mt-6 border border-line bg-black p-4 text-center">
        <p className="text-[10px] font-semibold tracking-widest text-muted uppercase">Your price</p>
        <p className="mt-1 text-2xl font-black">{formatGMD(price.final)}</p>
        {referred && (
          <p className="mt-1 text-xs text-accent">
            {REFERRAL_DISCOUNT_PERCENT}% referral discount applied (you save {formatGMD(price.saved)})
          </p>
        )}
      </div>

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
