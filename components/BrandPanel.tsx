import BrandLogo from "@/components/BrandLogo";
const POINTS = [
  "Short video lessons, module by module",
  "Quizzes that unlock the next module",
  "Live classes built in",
  "A certificate when you finish",
];

// The left side of the login and signup pages (desktop only).
export default function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden border-r border-line bg-surface lg:flex lg:flex-col lg:justify-between lg:p-12">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" />
      <div className="anim-glow pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />

      <p className="relative flex items-center gap-3 text-sm font-black tracking-tight text-accent">
        <BrandLogo size={44} />
        THE FORBES ACADEMY
      </p>

      <div className="relative">
        <h2 className="anim-fade-up text-4xl leading-tight font-black tracking-tight xl:text-5xl">
          Learn Public Speaking
          <br />
          <span className="text-muted">one clear step at a time.</span>
        </h2>
        <ul className="mt-8 space-y-3">
          {POINTS.map((p, i) => (
            <li key={p} className="anim-fade-up flex items-center gap-3 text-sm text-white/80" style={{ "--d": `${0.2 + i * 0.12}s` } as React.CSSProperties}>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-accent text-[10px] text-accent" aria-hidden>
                ✓
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>

      <span />
    </aside>
  );
}
