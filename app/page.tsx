import Link from "next/link";
import LegalLinks from "@/components/LegalLinks";

export default function LandingPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-6xl font-black leading-[0.95] tracking-tight sm:text-7xl">
        ApexTrade
        <br />
        <span className="text-muted">Academy</span>
      </h1>

      <p className="mt-6 max-w-md text-muted">
        Learn modern trading and scaling up skills, structured into clear
        modules. to make you profitable in no time.
      </p>

      <div className="mt-10 flex gap-4">
        <Link
          href="/login"
          className="rounded-(--radius-control) bg-white px-10 py-3 text-xs font-extrabold tracking-wider text-black uppercase"
        >
          Login
        </Link>
        <Link
          href="/signup"
          className="rounded-(--radius-control) border border-line px-10 py-3 text-xs font-extrabold tracking-wider uppercase hover:border-accent"
        >
          Sign up
        </Link>
      </div>
      <LegalLinks className="absolute bottom-6" />
    </main>
  );
}
