import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { whatsappLink } from "@/lib/whatsapp";
import { priceFor, isInPerson } from "@/lib/pricing";
import SignOutButton from "@/components/SignOutButton";
import { getMoneyCtx } from "@/lib/money";
import { chargeNote, priceText, waveAllowed } from "@/lib/currency";
import CurrencySwitcher from "@/components/CurrencySwitcher";
import { getSiteStatus } from "@/lib/siteStatus";
import { pricingOf } from "@/lib/siteSettings";
import AuthCard from "@/components/AuthCard";
import PayButtons from "@/components/PayButtons";
import { getAvailability } from "@/lib/payments/available";

function GroupList({ leader, members }: { leader: string; members: { full_name: string; whatsapp: string }[] }) {
  return (
    <div className="mt-6 border border-line p-4">
      <p className="text-[10px] font-semibold tracking-widest text-muted uppercase">People in your group</p>
      <ol className="mt-3 space-y-2 text-sm">
        <li className="flex justify-between gap-3"><span>{leader} (you)</span></li>
        {members.map((m) => (
          <li key={m.whatsapp + m.full_name} className="flex justify-between gap-3">
            <span>{m.full_name}</span>
            <span className="text-muted">{m.whatsapp}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default async function PendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, learning_mode, referral_discount, payment_status, batch, group_size")
    .eq("id", user!.id)
    .single();

  const site = await getSiteStatus();
  const pricing = pricingOf(site);
  const payAvail = await getAvailability(supabase, site);
  const referred = !!profile?.referral_discount;
  const price = priceFor(profile?.learning_mode, referred, pricing);
  const { ctx, resolved } = await getMoneyCtx(site);
  const wave = waveAllowed(ctx.enabled ? ctx.code : "GMD");
  const href = site.pay_whatsapp
    ? whatsappLink(profile?.full_name ?? "", user!.email ?? "", profile?.learning_mode ?? null, { referred, pricing, number: site.contact_whatsapp })
    : null;

  const inPerson = isInPerson(profile?.learning_mode);
  const isGroup = profile?.learning_mode === "group";

  // Everyone else in the group, so the leader can check the list is right.
  const { data: groupRows } = isGroup
    ? await supabase.from("group_members").select("full_name, whatsapp").eq("leader_id", user!.id).order("position")
    : { data: null };
  const groupList = groupRows ?? [];

  // In person students never get the video course: once paid they just wait to be added to their WhatsApp group.
  if (inPerson && profile?.payment_status === "cleared") {
    return (
      <AuthCard title="You are confirmed" subtitle="Your payment has been received">
        <p className="text-center text-sm text-muted">
          Thank you{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}. Our team will add you to the WhatsApp group for your
          batch. We will message you on the WhatsApp number you gave us.
        </p>
        <div className="mt-6 border border-line bg-black p-4 text-center">
          <p className="text-[10px] font-semibold tracking-widest text-muted uppercase">Your batch</p>
          <p className="mt-1 text-2xl font-black">{profile?.batch ? `Batch ${profile.batch}` : "To be confirmed"}</p>
        </div>
        {isGroup && groupList.length > 0 && (
          <GroupList leader={profile?.full_name ?? ""} members={groupList} />
        )}
        <div className="mt-6 flex justify-center">
          <SignOutButton />
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Account created" subtitle={inPerson ? "Complete your payment to confirm your place" : "Complete your payment to unlock courses"}>
      <p className="text-center text-sm text-muted">
        {inPerson ? (
          <>
            Pay online with {wave ? "Wave, Card or Crypto" : "Card or Crypto"}. Once we confirm your payment, our team adds you to
            the WhatsApp group for your batch. Or message us on WhatsApp and we will confirm it.
          </>
        ) : (
          <>
            Pay online with {wave ? "Wave, Card or Crypto" : "Card or Crypto"} and your courses unlock automatically once the
            payment is verified. Or message us on WhatsApp and we will confirm it.
          </>
        )}
      </p>

      <div className="mt-6 border border-line bg-black p-4 text-center">
        <p className="text-[10px] font-semibold tracking-widest text-muted uppercase">Your price</p>
        <p className="mt-1 text-2xl font-black">{priceText(price.final, ctx).text}</p>
        {isGroup && (
          <p className="mt-1 text-[11px] text-muted">for your whole group ({profile?.group_size ?? groupList.length + 1} people), one payment</p>
        )}
        {chargeNote(price.final, ctx) && <p className="mt-1 text-[11px] text-muted">{chargeNote(price.final, ctx)}</p>}
        {referred && (
          <p className="mt-1 text-xs text-accent">
            {pricing.referralPercent}% referral discount applied (you save {priceText(price.saved, ctx).text})
          </p>
        )}
      </div>

      <PayButtons
        waHref={href}
        enabled={{ wave: payAvail.wave.ok && wave, card: payAvail.card.ok, crypto: payAvail.crypto.ok }}
      />
      {site.local_prices_on && (
        <div className="mt-4 flex justify-center">
          <CurrencySwitcher code={resolved.code} country={resolved.country} source={resolved.source} />
        </div>
      )}
      {isGroup && groupList.length > 0 && <GroupList leader={profile?.full_name ?? ""} members={groupList} />}
      {inPerson ? (
        <div className="mt-6 flex justify-center">
          <SignOutButton />
        </div>
      ) : (
        <Link
          href="/dashboard"
          className="mt-5 block text-center text-xs text-muted hover:text-white"
        >
          Skip for now, go to my dashboard
        </Link>
      )}
    </AuthCard>
  );
}
