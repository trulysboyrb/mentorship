import Link from "next/link";
import LegalLinks from "@/components/LegalLinks";
import ThemeToggle from "@/components/ThemeToggle";
import { FAQ, STEPS, TESTIMONIALS } from "@/lib/landing";
import { PRICES, REFERRAL_DISCOUNT_PERCENT, formatGMD } from "@/lib/pricing";

const primary =
  "rounded-(--radius-control) bg-white px-10 py-3 text-center text-xs font-extrabold tracking-wider text-black uppercase hover:bg-accent";
const secondary =
  "rounded-(--radius-control) border border-line px-10 py-3 text-center text-xs font-extrabold tracking-wider uppercase hover:border-accent";

const heading = "text-xs font-extrabold tracking-widest text-accent uppercase";

export default function LandingPage() {
  const plans = [
    {
      name: "Online",
      price: PRICES.online,
      points: ["The full course on your phone or laptop", "Quizzes, certificate and live classes", "Market tools and downloadable notes"],
    },
    {
      name: "In Person",
      price: PRICES.in_person,
      points: ["Everything in Online", "Classes with us face to face", "Hands-on help with your questions"],
    },
  ];

  return (
    <div className="relative">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-sm font-black tracking-tight text-accent">APEXTRADE ACADEMY</span>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-xs font-semibold tracking-wider text-muted uppercase hover:text-white">
            Login
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto flex max-w-5xl flex-col items-center px-6 pt-16 pb-24 text-center sm:pt-24">
          <h1 className="text-6xl leading-[0.95] font-black tracking-tight sm:text-7xl">
            ApexTrade
            <br />
            <span className="text-muted">Academy</span>
          </h1>
          <p className="mt-6 max-w-md text-muted">
            Learn modern trading and blockchain skills, structured into clear modules.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link href="/signup" className={primary}>Sign up</Link>
            <Link href="/login" className={secondary}>Login</Link>
          </div>
          <a href="#how" className="mt-12 text-xs tracking-wider text-muted uppercase hover:text-white">
            See how it works ↓
          </a>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-5xl scroll-mt-8 px-6 py-16">
          <h2 className={heading}>How it works</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-(--radius-card) border border-line bg-surface p-6">
                <span className="text-3xl font-black text-accent">{i + 1}</span>
                <h3 className="mt-4 text-sm font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Prices */}
        <section id="prices" className="mx-auto max-w-5xl scroll-mt-8 px-6 py-16">
          <h2 className={heading}>Price</h2>
          <p className="mt-3 max-w-xl text-sm text-muted">
            One payment, no subscription. Pay on WhatsApp after you sign up and your courses unlock as soon as we confirm it.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {plans.map((p) => (
              <div key={p.name} className="flex flex-col rounded-(--radius-card) border border-line bg-surface p-8">
                <h3 className="text-xs font-extrabold tracking-widest uppercase">{p.name}</h3>
                <p className="mt-4 text-4xl font-black">{formatGMD(p.price)}</p>
                <p className="mt-1 text-xs text-muted">one-time payment</p>
                <ul className="mt-6 flex-1 space-y-3 text-sm text-white/80">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex gap-3">
                      <span className="text-accent" aria-hidden>✓</span>
                      {pt}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className={`${primary} mt-8`}>Get started</Link>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs text-muted">
            Have a referral code from a student? You get {REFERRAL_DISCOUNT_PERCENT}% off.
          </p>
        </section>

        {/* Real testimonials only: hidden until you add some in lib/landing.ts */}
        {TESTIMONIALS.length > 0 && (
          <section className="mx-auto max-w-5xl px-6 py-16">
            <h2 className={heading}>What students say</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {TESTIMONIALS.map((t) => (
                <figure key={t.name} className="rounded-(--radius-card) border border-line bg-surface p-6">
                  <blockquote className="text-sm leading-relaxed text-white/80">&ldquo;{t.text}&rdquo;</blockquote>
                  <figcaption className="mt-4 text-xs">
                    <span className="font-bold">{t.name}</span>
                    {t.detail && <span className="text-muted"> &middot; {t.detail}</span>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-8 px-6 py-16">
          <h2 className={heading}>Questions</h2>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-sm font-semibold">
                  {f.q}
                  <span className="text-accent transition group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final call */}
        <section className="mx-auto flex max-w-5xl flex-col items-center px-6 py-20 text-center">
          <h2 className="text-3xl font-black tracking-tight">Ready to start?</h2>
          <p className="mt-3 max-w-md text-sm text-muted">
            Create your account in a minute. Trading carries risk, and everything here is for education only.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link href="/signup" className={primary}>Sign up</Link>
            <Link href="/login" className={secondary}>Login</Link>
          </div>
        </section>
      </main>

      <footer className="px-6 pb-10">
        <LegalLinks />
      </footer>
    </div>
  );
}
