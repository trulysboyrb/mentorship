import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import RealtimeRefresh from "@/components/RealtimeRefresh";
import { formatGMD } from "@/lib/pricing";
import { getSiteStatus } from "@/lib/siteStatus";
import { pricingOf } from "@/lib/siteSettings";
import {
  type Analytics,
  estimateRevenue,
  funnelSteps,
  labelFor,
  lessonRows,
  pct,
} from "@/lib/analyticsView";

// Validated chart colours (pass contrast checks on the dark background).
const BLUE = "#5a8ee6";
const GREEN = "#10a97a";

function Breakdown({ title, items }: { title: string; items: { k: string; n: number }[] }) {
  const total = items.reduce((a, b) => a + b.n, 0);
  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <h3 className="text-xs font-extrabold tracking-widest uppercase">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No data yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((i) => (
            <li key={i.k}>
              <div className="flex justify-between text-xs">
                <span>{labelFor(i.k)}</span>
                <span className="text-muted">
                  {i.n} &middot; {pct(i.n, total)}%
                </span>
              </div>
              <div className="mt-1 h-1.5 bg-surface-2">
                <div className="h-full" style={{ width: `${pct(i.n, total)}%`, background: BLUE }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (me?.role !== "admin") redirect("/dashboard");

  const [{ data: raw }, { data: paidRows }] = await Promise.all([
    supabase.rpc("admin_analytics"),
    supabase
      .from("profiles")
      .select("learning_mode, referral_discount")
      .eq("role", "student")
      .eq("payment_status", "cleared"),
  ]);

  const a = raw as Analytics | null;
  if (!a) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-12">
        <AdminNav current="/admin/analytics" />
        <p className="mt-10 text-sm text-danger">Could not load analytics. Did you run the Phase 8 SQL?</p>
      </main>
    );
  }

  const funnel = funnelSteps(a.totals);
  const lessons = lessonRows(a.lessons, a.totals.cleared);
  const revenue = estimateRevenue(
    (paidRows ?? []).map((r) => ({
      learning_mode: r.learning_mode,
      referral_discount: !!r.referral_discount,
    })),
    pricingOf(await getSiteStatus())
  );

  // Weekly chart geometry
  const weeks = a.weeks;
  const maxV = Math.max(1, ...weeks.flatMap((w) => [w.signups, w.paid]));
  const W = 640;
  const H = 200;
  const padL = 28;
  const padB = 24;
  const slot = weeks.length ? (W - padL) / weeks.length : 0;
  const barW = Math.min(14, slot / 3);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <RealtimeRefresh />
      <AdminNav current="/admin/analytics" />
      <h2 className="mt-10 text-3xl font-black tracking-tight">Analytics</h2>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["Students", String(a.totals.students)],
          ["Paid", String(a.totals.cleared)],
          ["Conversion", `${pct(a.totals.cleared, a.totals.students)}%`],
          ["Estimated revenue", formatGMD(revenue.total)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-card border border-line bg-surface p-5">
            <p className="text-[10px] font-extrabold tracking-widest text-muted uppercase">{l}</p>
            <p className="mt-2 text-2xl font-black">{v}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">
        Revenue is an estimate from current prices and referral discounts. Payments happen on
        WhatsApp, so check your own records for the real figure.
      </p>

      <h3 className="mt-10 text-xs font-extrabold tracking-widest uppercase">Student funnel</h3>
      <div className="mt-4 rounded-card border border-line bg-surface p-5">
        <ul className="space-y-4">
          {funnel.map((f) => (
            <li key={f.label}>
              <div className="flex justify-between text-sm">
                <span>{f.label}</span>
                <span className="text-muted">
                  {f.count}
                  {f.label !== "Signed up" && ` · ${f.ofPrevious}% of previous step`}
                </span>
              </div>
              <div className="mt-1 h-2 bg-surface-2">
                <div className="h-full" style={{ width: `${f.ofFirst}%`, background: GREEN }} />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <h3 className="mt-10 text-xs font-extrabold tracking-widest uppercase">
        Signups and payments, last 12 weeks
      </h3>
      <div className="mt-4 rounded-card border border-line bg-surface p-5">
        <div className="mb-3 flex gap-5 text-xs">
          <span className="flex items-center gap-2">
            <i className="inline-block h-2.5 w-2.5" style={{ background: BLUE }} /> Signed up
          </span>
          <span className="flex items-center gap-2">
            <i className="inline-block h-2.5 w-2.5" style={{ background: GREEN }} /> Paid
          </span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
          aria-label="Weekly signups and paid students for the last 12 weeks">
          <line x1={padL} x2={W} y1={H - padB} y2={H - padB} className="stroke-line" />
          <text x={0} y={12} fontSize="10" className="fill-muted">{maxV}</text>
          <text x={0} y={H - padB} fontSize="10" className="fill-muted">0</text>
          {weeks.map((w, i) => {
            const x = padL + i * slot + slot / 2;
            const h1 = ((H - padB - 16) * w.signups) / maxV;
            const h2 = ((H - padB - 16) * w.paid) / maxV;
            return (
              <g key={w.week}>
                <rect x={x - barW - 1} y={H - padB - h1} width={barW} height={h1} fill={BLUE} />
                <rect x={x + 1} y={H - padB - h2} width={barW} height={h2} fill={GREEN} />
                {w.signups > 0 && (
                  <text x={x - barW / 2 - 1} y={H - padB - h1 - 3} fontSize="9" textAnchor="middle" className="fill-white/80">
                    {w.signups}
                  </text>
                )}
                {w.paid > 0 && (
                  <text x={x + barW / 2 + 1} y={H - padB - h2 - 3} fontSize="9" textAnchor="middle" className="fill-white/80">
                    {w.paid}
                  </text>
                )}
                <text x={x} y={H - 8} fontSize="9" textAnchor="middle" className="fill-muted">
                  {w.week.slice(5)}
                </text>
              </g>
            );
          })}
        </svg>
        <details className="mt-3 text-xs text-muted">
          <summary className="cursor-pointer">Show as table</summary>
          <table className="mt-3 w-full text-left">
            <thead>
              <tr><th className="py-1">Week starting</th><th>Signed up</th><th>Paid</th></tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.week}><td className="py-1">{w.week}</td><td>{w.signups}</td><td>{w.paid}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>

      <h3 className="mt-10 text-xs font-extrabold tracking-widest uppercase">Lessons: where students drop off</h3>
      <div className="mt-4 overflow-x-auto rounded-card border border-line">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-[10px] tracking-widest text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Lesson</th>
              <th className="px-4 py-3">Started</th>
              <th className="px-4 py-3">Completed</th>
              <th className="px-4 py-3">% of paid students</th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((l) => (
              <tr key={l.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <span className="text-muted">M{l.module} · </span>
                  {l.title}
                  {l.biggestDrop && (
                    <span className="ml-2 text-[10px] font-extrabold tracking-widest text-danger uppercase">
                      Biggest drop (-{l.drop} pts)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">{l.started}</td>
                <td className="px-4 py-3 text-muted">{l.completed}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-28 bg-surface-2">
                      <div className="h-full" style={{ width: `${l.completedPct}%`, background: GREEN }} />
                    </div>
                    <span className="text-xs text-muted">{l.completedPct}%</span>
                  </div>
                </td>
              </tr>
            ))}
            {lessons.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">No lessons with video yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Breakdown title="How they found you" items={a.sources} />
        <Breakdown title="Experience level" items={a.experience} />
        <Breakdown title="Online vs in person" items={a.modes} />
      </div>

      <h3 className="mt-10 text-xs font-extrabold tracking-widest uppercase">Top referrers</h3>
      <div className="mt-4 overflow-x-auto rounded-card border border-line">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-[10px] tracking-widest text-muted uppercase">
            <tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Joined with code</th><th className="px-4 py-3">Paid</th></tr>
          </thead>
          <tbody>
            {a.referrers.map((r) => (
              <tr key={r.name} className="border-b border-line last:border-0">
                <td className="px-4 py-3">{r.name}</td>
                <td className="px-4 py-3 text-muted">{r.total}</td>
                <td className="px-4 py-3 text-muted">{r.paid}</td>
              </tr>
            ))}
            {a.referrers.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-muted">No referrals yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
