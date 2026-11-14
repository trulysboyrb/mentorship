import Link from "next/link";
import { DRAFT_NOTICE, LAST_UPDATED } from "@/lib/legal";
import LegalLinks from "@/components/LegalLinks";

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-9">
      <h2 className="text-base font-bold">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-white/70 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

export default function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/" className="text-sm font-black tracking-tight text-accent">
        FORBES ACADEMY
      </Link>

      <h1 className="mt-10 text-4xl font-black tracking-tight">{title}</h1>
      <p className="mt-2 text-xs text-muted">Last updated: {LAST_UPDATED}</p>

      {DRAFT_NOTICE && (
        <p className="mt-6 rounded-control border border-danger/40 p-3 text-xs text-danger">
          Draft template. Have a qualified lawyer review this page and fill in
          your real details before launch.
        </p>
      )}

      {children}

      <LegalLinks className="mt-14 !justify-start" />
    </main>
  );
}
