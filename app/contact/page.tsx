import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSiteStatus } from "@/lib/siteStatus";
import { WHATSAPP_NUMBER } from "@/lib/config";
import ContactTemplate from "@/components/ContactTemplate";
import LegalLinks from "@/components/LegalLinks";

export const metadata = { title: "Contact Us" };

export default async function ContactPage() {
  const site = await getSiteStatus();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user
    ? (await supabase.from("profiles").select("full_name").eq("id", user.id).single()).data
    : null;

  // The number from Settings wins; if it is empty we fall back to the one in lib/config.ts
  // (ignored while it is still the "XXXX" placeholder).
  const wa = site.contact_whatsapp || (/^[0-9]{6,15}$/.test(WHATSAPP_NUMBER) ? WHATSAPP_NUMBER : "");

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/" className="text-sm font-black tracking-tight text-accent">
        FORBES ACADEMY
      </Link>
      <h1 className="mt-10 text-4xl font-black tracking-tight">Contact Us</h1>
      <p className="mt-2 text-sm text-muted">{site.contact_business}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {wa && (
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-card border border-line bg-surface p-4 hover:border-accent"
          >
            <p className="text-[11px] font-bold tracking-widest text-muted uppercase">WhatsApp</p>
            <p className="mt-1 text-sm font-bold">+{wa}</p>
          </a>
        )}
        {site.contact_email && (
          <a href={`mailto:${site.contact_email}`} className="rounded-card border border-line bg-surface p-4 hover:border-accent">
            <p className="text-[11px] font-bold tracking-widest text-muted uppercase">Email</p>
            <p className="mt-1 text-sm font-bold break-all">{site.contact_email}</p>
          </a>
        )}
        {site.contact_hours && (
          <div className="rounded-card border border-line bg-surface p-4 sm:col-span-2">
            <p className="text-[11px] font-bold tracking-widest text-muted uppercase">Hours</p>
            <p className="mt-1 text-sm font-bold">{site.contact_hours}</p>
          </div>
        )}
      </div>

      <div className="mt-6">
        <ContactTemplate
          business={site.contact_business}
          email={site.contact_email}
          whatsapp={wa}
          defaultName={profile?.full_name ?? ""}
          defaultEmail={user?.email ?? ""}
        />
      </div>

      <LegalLinks className="mt-10" />
    </main>
  );
}
