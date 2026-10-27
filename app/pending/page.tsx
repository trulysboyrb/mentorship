import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { whatsappLink } from "@/lib/whatsapp";
import { formatGMD, priceFor } from "@/lib/pricing";
import { getSiteStatus } from "@/lib/siteStatus";
import { pricingOf } from "@/lib/siteSettings";
import AuthCard from "@/components/AuthCard";
import PayButtons from "@/components/PayButtons";
import { getAvailability } from "@/lib/payments/available";

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

  const site = await getSiteStatus();
  const pricing = pricingOf(site);
  const payAvail = await getAvailability(supabase, site);
  const referred = !!profile?.referral_discount;
  const price = priceFor(profile?.learning_mode, referred, pricing);
  const href = site.pay_whatsapp
    ? whatsappLink(profile?.full_name ?? "", user!.email ?? "", profile?.learning_mode ?? null, { referred, pricing, number: site.contact_whatsapp })
    : null;

  return (
    <AuthCard title="Account created" subtitle="Complete your payment to unlock courses">
      <p className="text-center text-sm text-muted">
        Pay online with Wave, Card or Crypto and your courses unlock automatically once the
        payment is verified. Or message us on WhatsApp and we will confirm it.
      </p>

      <div className="mt-6 border border-line bg-black p-4 text-center">
        <p className="text-[10px] font-semibold tracking-widest text-muted uppercase">Your price</p>
        <p className="mt-1 text-2xl font-black">{formatGMD(price.final)}</p>
        {referred && (
          <p className="mt-1 text-xs text-accent">
            {pricing.referralPercent}% referral discount applied (you save {formatGMD(price.saved)})
          </p>
        )}
      </div>

      <PayButtons
        waHref={href}
        enabled={{ wave: payAvail.wave.ok, card: payAvail.card.ok, crypto: payAvail.crypto.ok }}
      />
      <Link
        href="/dashboard"
        className="mt-5 block text-center text-xs text-muted hover:text-white"
      >
        Skip for now, go to my dashboard
      </Link>
    </AuthCard>
  );
}
