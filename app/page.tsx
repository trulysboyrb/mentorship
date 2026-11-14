import Link from "next/link";
import LegalLinks from "@/components/LegalLinks";
import ThemeToggle from "@/components/ThemeToggle";
import Reveal from "@/components/Reveal";
import { FAQ, STEPS, TESTIMONIALS } from "@/lib/landing";
import { getSiteStatus } from "@/lib/siteStatus";
import { getMoneyCtx } from "@/lib/money";
import { chargeNote, priceText, waveAllowed } from "@/lib/currency";
import CurrencySwitcher from "@/components/CurrencySwitcher";
import BrandLogo from "@/components/BrandLogo";

const primary =
  "rounded-(--radius-control) bg-white px-10 py-3.5 text-center text-xs font-extrabold tracking-wider text-black uppercase transition hover:bg-accent hover:-translate-y-0.5";
const secondary =
  "rounded-(--radius-control) border border-line px-10 py-3.5 text-center text-xs font-extrabold tracking-wider uppercase transition hover:border-accent hover:-translate-y-0.5";

const heading = "text-xs font-extrabold tracking-widest text-accent uppercase";
const title = "mt-3 text-3xl font-black tracking-tight sm:text-4xl";

// Everything in this list exists on the site today.
const FEATURES = [
  { icon: "▶", name: "Video lessons", text: "Short lessons in a clear order, with notes and downloads for each one." },
  { icon: "✓", name: "Module quizzes", text: "Pass the quiz to unlock the next module, so you really learn it." },
  { icon: "●", name: "Live classes", text: "A schedule with reminders, so you never miss a session." },
  { icon: "★", name: "Certificate", text: "Finish the course and get a certificate with your name on it." },
  { icon: "▢", name: "Works on your phone", text: "Install it like an app and learn anywhere on your phone or laptop." },
];

const iconProps = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const ABOUT_POINTS = [
  {
    name: "Our Vision",
    text: "To champion and nurture excellence in every sphere of national life.",
    icon: (
      <svg {...iconProps}>
        <path d="M2 9l10-5 10 5-10 5L2 9z" />
        <path d="M6 11.5V16c0 1.2 2.7 3 6 3s6-1.8 6-3v-4.5" />
        <path d="M22 9v6" />
      </svg>
    ),
  },
  {
    name: "Our Mission",
    text: "Through high-quality, context-appropriate training, mentoring, and coaching, TFA equips professionals and institutions with the confidence, competence, and clarity needed to reach their full potential.",
    icon: (
      <svg {...iconProps}>
        <path d="M3 10v4h3l7 4V6L6 10H3z" />
        <path d="M16.5 9a4 4 0 010 6" />
        <path d="M19 6.5a8 8 0 010 11" />
      </svg>
    ),
  },
];

export default async function LandingPage() {
  const site = await getSiteStatus();
  const { ctx, resolved } = await getMoneyCtx(site);
  const plans = [
    {
      name: "Online",
      price: site.price_online,
      points: ["The full course on your phone or laptop", "Quizzes, certificate and live classes", "Downloadable notes for every lesson"],
    },
    {
      name: "In Person",
      price: site.price_in_person,
      points: ["Everything in Online", "Classes with us face to face", "Hands-on help with your questions"],
    },
  ];

  return (
    <div className="relative overflow-x-clip">
      <noscript>
        <style>{`.reveal,.anim-fade-up,.anim-fade-in{opacity:1!important;transform:none!important}`}</style>
      </noscript>

      <header className="sticky top-0 z-40 border-b border-line/60 bg-bg/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="inline-flex items-center gap-2.5">
            <BrandLogo size={36} />
            <span className="text-sm font-black tracking-tight text-accent">THE FORBES ACADEMY</span>
          </span>
          <nav className="flex items-center gap-5">
            <a href="#about" className="hidden text-xs font-semibold tracking-wider text-muted uppercase hover:text-white sm:block">
              About
            </a>
            <a href="#prices" className="hidden text-xs font-semibold tracking-wider text-muted uppercase hover:text-white sm:block">
              Prices
            </a>
            <a href="#faq" className="hidden text-xs font-semibold tracking-wider text-muted uppercase hover:text-white sm:block">
              FAQ
            </a>
            <Link href="/login" className="text-xs font-semibold tracking-wider text-muted uppercase hover:text-white">
              Login
            </Link>
            <Link href="/signup" className="hidden border border-accent px-4 py-2 text-xs font-extrabold tracking-wider text-accent uppercase transition hover:bg-accent hover:text-black sm:block">
              Sign up
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative">
          <div className="grid-bg pointer-events-none absolute inset-0" />
          <div className="anim-glow pointer-events-none absolute top-10 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative mx-auto flex max-w-5xl flex-col items-center px-6 pt-16 pb-16 text-center sm:pt-24">
            <h1 className="anim-fade-up text-5xl leading-[1.02] font-black tracking-tight sm:text-7xl" style={{ "--d": "0.1s" } as React.CSSProperties}>
              Learn
              <br />
              <span className="text-accent">Public speaking</span>
            </h1>
            <p className="anim-fade-up mt-6 max-w-md text-muted" style={{ "--d": "0.2s" } as React.CSSProperties}>
              Speak with confidence in front of any audience. Learn how to shape your message, calm your nerves and deliver it clearly, in short modules you can follow at your own pace.
            </p>
            <div className="anim-fade-up mt-10 flex flex-col gap-4 sm:flex-row" style={{ "--d": "0.3s" } as React.CSSProperties}>
              <Link href="/signup" className={primary}>Sign up</Link>
              <Link href="/login" className={secondary}>Login</Link>
            </div>
          </div>
        </section>

        {/* About */}
        <section id="about" className="mx-auto max-w-5xl scroll-mt-20 px-6 py-16">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <div className="overflow-hidden rounded-(--radius-card) border border-line bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/about.jpg"
                  alt="A student holding up her certificate at a Forbes Academy training"
                  width={1100}
                  height={825}
                  loading="lazy"
                  className="aspect-4/3 w-full object-cover"
                />
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className={heading}>About us</h2>
              <p className={title}>Welcome to The Forbes Academy</p>
              <p className="mt-6 border-l-2 border-accent pl-5 text-sm leading-relaxed text-muted">
                The Forbes Academy is a premier professional training institute based in The Gambia, dedicated to empowering leaders, cultivating excellence, and strengthening institutional performance across sectors. TFA is registered as Forbes Executive Training (FET) in Nigeria.
              </p>
              <div className="mt-8 space-y-6">
                {ABOUT_POINTS.map((a) => (
                  <div key={a.name} className="flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-accent" aria-hidden>
                      {a.icon}
                    </span>
                    <div>
                      <h3 className="text-base font-bold">{a.name}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{a.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-5xl px-6 py-20">
          <Reveal>
            <h2 className={heading}>What you get</h2>
            <p className={title}>Everything you need to learn properly.</p>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.name} delay={(i % 3) * 0.08}>
                <div className="lift h-full rounded-(--radius-card) border border-line bg-surface p-6">
                  <span className="flex h-10 w-10 items-center justify-center border border-accent/50 text-accent" aria-hidden>
                    {f.icon}
                  </span>
                  <h3 className="mt-5 text-sm font-bold">{f.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{f.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-5xl scroll-mt-20 px-6 py-16">
          <Reveal>
            <h2 className={heading}>How it works</h2>
            <p className={title}>Four steps, start to finish.</p>
          </Reveal>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <Reveal delay={i * 0.1}>
                  <div className="lift h-full rounded-(--radius-card) border border-line bg-surface p-6">
                    <span className="text-4xl font-black text-accent">{i + 1}</span>
                    <h3 className="mt-4 text-sm font-bold">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>

        {/* Tutor */}
        <section id="tutor" className="mx-auto max-w-5xl scroll-mt-20 px-6 py-16">
          <Reveal className="text-center">
            <h2 className={heading}>Course instructors</h2>
            <p className={title}>Meet our tutor</p>
          </Reveal>
          <Reveal delay={0.08} className="mx-auto mt-10 max-w-xs">
            <figure className="lift overflow-hidden rounded-(--radius-card) border border-line bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/tutor.jpg"
                alt="Pastor Francis Forbes"
                width={720}
                height={901}
                loading="lazy"
                className="aspect-4/5 w-full object-cover object-top"
              />
              <figcaption className="px-5 py-5 text-center">
                <p className="text-lg font-bold">Pastor Francis Forbes</p>
                <p className="mt-1 text-sm text-muted">CEO, Coach and Lead Trainer</p>
              </figcaption>
            </figure>
          </Reveal>
        </section>

        {/* Prices */}
        <section id="prices" className="mx-auto max-w-5xl scroll-mt-20 px-6 py-16">
          <Reveal>
            <h2 className={heading}>Price</h2>
            <p className="mt-3 max-w-xl text-sm text-muted">
              One payment, no subscription. Pay online with {waveAllowed(ctx.code) ? "Wave, card or crypto" : "card or crypto"}, or on WhatsApp. Your courses unlock as soon as the payment is confirmed.
            </p>
          </Reveal>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {plans.map((p, i) => (
              <Reveal key={p.name} delay={i * 0.1}>
                <div className="lift flex h-full flex-col rounded-(--radius-card) border border-line bg-surface p-8">
                  <h3 className="text-xs font-extrabold tracking-widest uppercase">{p.name}</h3>
                  <p className="mt-4 text-4xl font-black">{priceText(p.price, ctx).text}</p>
                  <p className="mt-1 text-xs text-muted">one-time payment</p>
                  {chargeNote(p.price, ctx) && <p className="mt-1 text-[11px] text-muted">{chargeNote(p.price, ctx)}</p>}
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
              </Reveal>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">
              Have a referral code from a student? You get {site.referral_percent}% off.
            </p>
            {site.local_prices_on && <CurrencySwitcher code={resolved.code} country={resolved.country} source={resolved.source} />}
          </div>
        </section>

        {/* Real testimonials only: hidden until you add some in lib/landing.ts */}
        {TESTIMONIALS.length > 0 && (
          <section className="mx-auto max-w-5xl px-6 py-16">
            <Reveal>
              <h2 className={heading}>What students say</h2>
            </Reveal>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {TESTIMONIALS.map((t, i) => (
                <Reveal key={t.name} delay={i * 0.08}>
                  <figure className="rounded-(--radius-card) border border-line bg-surface p-6">
                    <blockquote className="text-sm leading-relaxed text-white/80">&ldquo;{t.text}&rdquo;</blockquote>
                    <figcaption className="mt-4 text-xs">
                      <span className="font-bold">{t.name}</span>
                      {t.detail && <span className="text-muted"> &middot; {t.detail}</span>}
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-5xl scroll-mt-20 px-6 py-16">
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <Reveal>
              <div className="overflow-hidden rounded-(--radius-card) border border-line bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/classroom.jpg"
                  alt="A Forbes Academy classroom set up for a training day"
                  width={1100}
                  height={825}
                  loading="lazy"
                  className="aspect-4/3 w-full object-cover"
                />
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className={heading}>FAQ</h2>
              <p className={title}>Frequently asked questions</p>
              <div className="mt-8 space-y-3">
                {FAQ.map((f) => (
                  <details key={f.q} className="group rounded-(--radius-card) border border-line bg-surface px-5 py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-sm font-semibold">
                      {f.q}
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-accent transition group-open:rotate-45" aria-hidden>+</span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
                  </details>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* Final call */}
        <section className="relative">
          <div className="anim-glow pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-3xl" />
          <Reveal className="relative mx-auto flex max-w-5xl flex-col items-center px-6 py-24 text-center">
            <h2 className="text-4xl font-black tracking-tight">Ready to start?</h2>
            <p className="mt-3 max-w-md text-sm text-muted">
              Create your account in a minute and start learning today.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link href="/signup" className={primary}>Sign up</Link>
              <Link href="/login" className={secondary}>Login</Link>
            </div>
          </Reveal>
        </section>
      </main>

      {/* Contact Us */}
      <section id="contact" className="px-6 pb-16">
        <Reveal className="mx-auto max-w-3xl rounded-card border border-line bg-surface p-8 text-center">
          <h2 className="text-2xl font-black tracking-tight">Contact Us</h2>
          <p className="mt-2 text-sm text-muted">
            Questions before you join? Send us a message. We write it for you, you just pick a topic.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link href="/contact" className={primary}>Send a message</Link>
          </div>
          {(site.contact_whatsapp || site.contact_email || site.contact_hours) && (
            <p className="mt-4 text-xs text-muted">
              {[site.contact_whatsapp && `WhatsApp +${site.contact_whatsapp}`, site.contact_email, site.contact_hours]
                .filter(Boolean)
                .join("  ·  ")}
            </p>
          )}
        </Reveal>
      </section>

      <footer className="px-6 pb-10">
        <LegalLinks />
      </footer>
    </div>
  );
}
