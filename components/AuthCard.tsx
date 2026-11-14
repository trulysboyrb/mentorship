import Link from "next/link";
import LegalLinks from "@/components/LegalLinks";
import BrandPanel from "@/components/BrandPanel";
import BrandLogo from "@/components/BrandLogo";

// Shared frame for login, signup, forgot / reset password and the email-confirmed page.
export default function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <BrandPanel />
      <main className="flex flex-col items-center justify-center px-4 py-10">
        <div className="anim-fade-up w-full max-w-md rounded-card border border-line bg-surface p-8 sm:p-10">
          <Link href="/" className="mb-6 flex items-center justify-center gap-2 text-xs font-black tracking-tight text-accent lg:hidden">
            <BrandLogo size={32} />
            THE FORBES ACADEMY
          </Link>
          <h1 className="text-center text-3xl font-black tracking-tight">{title}</h1>
          <p className="mt-2 text-center text-sm text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
        <Link href="/" className="mt-6 text-xs text-muted hover:text-white">
          &larr; Back to home
        </Link>
        <LegalLinks className="mt-4" />
      </main>
    </div>
  );
}
