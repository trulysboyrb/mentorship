import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { whatsappHelpLink } from "@/lib/whatsapp";
import { getSiteStatus } from "@/lib/siteStatus";
import { METHODS, isPayMethod, WHATSAPP_COLORS } from "@/lib/paymentMethods";
import AuthCard from "@/components/AuthCard";
import RealtimeRefresh from "@/components/RealtimeRefresh";
import PollRefresh from "@/components/PollRefresh";

// Where the student lands after the payment company's page. The payment itself is confirmed
// by the company's secure message to our server; this page just waits and shows what happened.
export default async function PayReturnPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("payment_status")
    .eq("id", user.id)
    .single();
  if (profile?.payment_status === "cleared") redirect("/dashboard?paid=1");

  const site = await getSiteStatus();
  const uuid = /^[0-9a-f-]{36}$/i.test(p ?? "") ? p : null;
  const { data: pay } = uuid
    ? await supabase
        .from("payments")
        .select("id, method, status, note, created_at, amount_gmd")
        .eq("id", uuid)
        .maybeSingle()
    : { data: null };

  const info = pay && isPayMethod(pay.method) ? METHODS[pay.method] : null;
  const waitedMs = pay ? Date.now() - new Date(pay.created_at).getTime() : 0;
  const ref = pay ? pay.id.slice(0, 8).toUpperCase() : "";
  const failed = pay && ["failed", "cancelled", "expired"].includes(pay.status);

  return (
    <AuthCard
      title={failed ? "Payment not completed" : pay?.status === "underpaid" ? "Payment incomplete" : "Checking your payment"}
      subtitle={failed ? "You can try again" : "This page updates by itself"}
    >
      <RealtimeRefresh table="payments" filter={`user_id=eq.${user.id}`} />
      <RealtimeRefresh table="profiles" filter={`id=eq.${user.id}`} />
      {!failed && <PollRefresh seconds={10} />}

      {!pay && (
        <p className="text-center text-sm text-muted">
          We could not find that payment. If you paid, your courses will still unlock by themselves.
        </p>
      )}

      {pay && !failed && pay.status !== "underpaid" && (
        <>
          <div className="flex justify-center">
            <span
              className="h-10 w-10 animate-spin rounded-full border-4 border-line"
              style={{ borderTopColor: info?.bg ?? "#6c579e" }}
            />
          </div>
          <p className="mt-5 text-center text-sm text-muted">
            Waiting for {info?.provider ?? "the payment company"} to confirm your payment. This usually takes under a
            minute{pay.method === "crypto" ? ", but crypto can take a few minutes" : ""}. Your courses unlock the
            moment it is confirmed. You do not need to do anything.
          </p>
        </>
      )}

      {pay?.status === "underpaid" && (
        <p className="text-center text-sm text-muted">
          We received less than the full price. Please contact us on WhatsApp with your reference below and we will
          sort it out.
        </p>
      )}

      {failed && (
        <p className="text-center text-sm text-muted">
          {pay?.status === "expired"
            ? "The payment time ran out before it was paid."
            : pay?.status === "cancelled"
              ? "The payment was cancelled."
              : "The payment did not go through."}{" "}
          If money left your account, message us on WhatsApp with the reference below.
        </p>
      )}

      {pay && (
        <p className="mt-6 text-center text-xs text-muted">
          Reference: <span className="font-mono font-bold text-white">{ref}</span>
        </p>
      )}

      {pay && (waitedMs > 5 * 60 * 1000 || failed || pay.status === "underpaid") && (
        <a
          href={whatsappHelpLink(`Hi, I paid on Forbes Academy but my account is not cleared yet. Payment reference: ${ref}`, site.contact_whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 block rounded-control px-6 py-3.5 text-center text-xs font-extrabold tracking-wider uppercase"
          style={{ background: WHATSAPP_COLORS.bg, color: WHATSAPP_COLORS.fg }}
        >
          Taking long? Message us on WhatsApp
        </a>
      )}

      <Link href="/dashboard" className="mt-5 block text-center text-xs text-muted hover:text-white">
        Go to my dashboard
      </Link>
    </AuthCard>
  );
}
