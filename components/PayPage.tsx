import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { priceFor, formatGMD } from "@/lib/pricing";
import { getSiteStatus } from "@/lib/siteStatus";
import { pricingOf } from "@/lib/siteSettings";
import { gmdToUsd, formatUsd } from "@/lib/paymentMath";
import { whatsappLink } from "@/lib/whatsapp";
import { METHODS, type PayMethod } from "@/lib/paymentMethods";
import { getAvailability } from "@/lib/payments/available";
import PayPanel from "@/components/PayPanel";
import LegalLinks from "@/components/LegalLinks";

// One page per payment method. Each has its own colour, steps and provider.
export default async function PayPage({
  method,
  searchParams,
}: {
  method: PayMethod;
  searchParams: { cancelled?: string };
}) {
  const info = METHODS[method];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, learning_mode, payment_status, referral_discount")
    .eq("id", user.id)
    .single();
  if (profile?.payment_status === "cleared") redirect("/dashboard");

  const site = await getSiteStatus();
  const pricing = pricingOf(site);
  const referred = !!profile?.referral_discount;
  const price = priceFor(profile?.learning_mode, referred, pricing);
  const avail = (await getAvailability(supabase, site))[method];
  const { data: rate } = await supabase.rpc("get_gmd_per_usd");
  const usd = method === "crypto" ? gmdToUsd(price.final, Number(rate ?? 0)) : null;
  const wa = site.pay_whatsapp
    ? whatsappLink(profile?.full_name ?? "", user.email ?? "", profile?.learning_mode ?? null, { referred, pricing, number: site.contact_whatsapp })
    : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md border border-line bg-surface p-8 sm:p-10" style={{ borderTop: `4px solid ${info.bg}` }}>
        <p className="text-center text-[10px] font-extrabold tracking-widest uppercase" style={{ color: info.bg }}>
          Pay via {info.label}
        </p>
        <h1 className="mt-2 text-center text-3xl font-black tracking-tight">Unlock your courses</h1>
        <p className="mt-2 text-center text-sm text-muted">{info.blurb}</p>

        <div className="mt-6 border border-line bg-black p-4 text-center">
          <p className="text-[10px] font-semibold tracking-widest text-muted uppercase">You pay</p>
          <p className="mt-1 text-2xl font-black">{formatGMD(price.final)}</p>
          {usd !== null && <p className="mt-1 text-xs text-muted">About {formatUsd(usd)} in crypto</p>}
          {referred && (
            <p className="mt-1 text-xs text-accent">
              {pricing.referralPercent}% referral discount applied (you save {formatGMD(price.saved)})
            </p>
          )}
        </div>

        <ol className="mt-6 space-y-3 text-sm">
          {info.steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center text-xs font-extrabold"
                style={{ background: info.bg, color: info.fg }}
              >
                {i + 1}
              </span>
              <span className="text-muted">{s}</span>
            </li>
          ))}
        </ol>

        {searchParams.cancelled && (
          <p className="mt-6 border border-line p-3 text-xs text-muted">
            The payment was cancelled. You were not charged. You can try again below.
          </p>
        )}

        <div className="mt-6">
          {avail.ok ? (
            <PayPanel method={method} bg={info.bg} fg={info.fg} />
          ) : (
            <p className="border border-line p-3 text-xs text-muted">
              {info.label} payments are not available right now.{wa ? " Please pay via WhatsApp instead." : " Please check back soon."}
            </p>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] text-muted">
          Secure checkout by {info.provider}. We never see or store your card or wallet details.
        </p>

        <div className="mt-6 flex items-center justify-between text-xs">
          <Link href="/dashboard" className="text-muted hover:text-white">
            Back
          </Link>
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-white">
              Prefer WhatsApp?
            </a>
          )}
        </div>
      </div>
      <LegalLinks className="mt-6" />
    </main>
  );
}
