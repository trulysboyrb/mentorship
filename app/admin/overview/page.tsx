import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CountUp from "@/components/CountUp";
import AdminNav from "@/components/AdminNav";
import RealtimeRefresh from "@/components/RealtimeRefresh";
import { formatGMD } from "@/lib/pricing";
import { BRAND } from "@/lib/config";
import { METHODS, clearedViaLabel, isPayMethod, type ClearedVia } from "@/lib/paymentMethods";
import { type OverviewData, revenueSplit, timeAgo, waLink } from "@/lib/overviewView";
import { pct } from "@/lib/analyticsView";

const BLUE = "#5a8ee6";
const GREEN = "#10a97a";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="lift rounded-card border border-line bg-surface p-5">
      <p className="text-[10px] font-extrabold tracking-widest text-muted uppercase">{label}</p>
      <p className="mt-2 text-2xl font-black"><CountUp value={value} /></p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

function Bars({
  days,
  pick,
  color,
  label,
}: {
  days: OverviewData["days"];
  pick: (d: OverviewData["days"][number]) => number;
  color: string;
  label: string;
}) {
  const W = 640;
  const H = 130;
  const padB = 18;
  const max = Math.max(1, ...days.map(pick));
  const slot = W / Math.max(1, days.length);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label}>
      <line x1={0} x2={W} y1={H - padB} y2={H - padB} className="stroke-line" />
      {days.map((d, i) => {
        const v = pick(d);
        const h = ((H - padB - 12) * v) / max;
        return (
          <g key={d.day}>
            <rect x={i * slot + slot * 0.15} y={H - padB - h} width={slot * 0.7} height={h} fill={color}>
              <title>{`${d.day}: ${v}`}</title>
            </rect>
            {i % 5 === 0 && (
              <text x={i * slot + slot / 2} y={H - 5} fontSize="9" textAnchor="middle" className="fill-muted">
                {d.day.slice(5)}
              </text>
            )}
          </g>
        );
      })}
      <text x={0} y={10} fontSize="10" className="fill-muted">
        {max}
      </text>
    </svg>
  );
}

export default async function OverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (me?.role !== "admin") redirect("/dashboard");

  const [{ data: raw, error }, { data: rows }] = await Promise.all([
    supabase.rpc("admin_overview"),
    supabase
      .from("profiles")
      .select("learning_mode, referral_discount, cleared_via, cleared_at")
      .eq("role", "student")
      .eq("payment_status", "cleared"),
  ]);

  const o = raw as OverviewData | null;
  if (error || !o) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-12">
        <AdminNav current="/admin/overview" />
        <p className="mt-10 text-sm text-danger">
          Could not load the overview{error ? `: ${error.message}` : ""}. Did you run the Phase 11 SQL?
        </p>
      </main>
    );
  }

  const rev = revenueSplit(
    (rows ?? []).map((r) => ({
      learning_mode: r.learning_mode,
      referral_discount: !!r.referral_discount,
      cleared_via: r.cleared_via,
      cleared_at: r.cleared_at,
    })),
    o.online
  );
  const attention = o.attention;
  const needs =
    attention.payouts + attention.underpaid + attention.flagged + attention.unmatched + (o.stale_pending.count > 0 ? 1 : 0);
  const maxMethod = Math.max(1, ...o.methods.map((m) => m.n));

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <RealtimeRefresh />
      <RealtimeRefresh table="payments" />
      <AdminNav current="/admin/overview" />
      <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-3xl font-black tracking-tight">Overview</h2>
        <Link href="/admin/analytics" className="text-xs text-accent hover:underline">
          Funnel and lesson drop-off &rarr;
        </Link>
      </div>

      {needs > 0 && (
        <div className="mt-6 rounded-card border border-danger bg-surface p-5">
          <h3 className="text-sm font-extrabold text-danger">Needs your attention</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {attention.payouts > 0 && (
              <li>
                <Link href="/admin/payouts" className="hover:underline">
                  <b>{attention.payouts}</b> payout request{attention.payouts === 1 ? "" : "s"} waiting
                </Link>
              </li>
            )}
            {attention.underpaid > 0 && (
              <li>
                <Link href="/admin/payments" className="hover:underline">
                  <b>{attention.underpaid}</b> online payment{attention.underpaid === 1 ? "" : "s"} paid too little
                </Link>
              </li>
            )}
            {attention.flagged > 0 && (
              <li>
                <Link href="/admin/payments" className="hover:underline">
                  <b>{attention.flagged}</b> paid payment{attention.flagged === 1 ? "" : "s"} flagged (paid twice or
                  student deleted). Check for refunds
                </Link>
              </li>
            )}
            {attention.unmatched > 0 && (
              <li>
                <Link href="/admin/payments" className="hover:underline">
                  <b>{attention.unmatched}</b> payment message{attention.unmatched === 1 ? "" : "s"} could not be matched
                  to a student
                </Link>
              </li>
            )}
            {o.stale_pending.count > 0 && (
              <li>
                <a href="#follow-up" className="hover:underline">
                  <b>{o.stale_pending.count}</b> student{o.stale_pending.count === 1 ? "" : "s"} signed up but have not
                  paid for 3+ days
                </a>
              </li>
            )}
          </ul>
        </div>
      )}

      <h3 className="mt-10 text-xs font-extrabold tracking-widest uppercase">Revenue</h3>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="All time" value={formatGMD(rev.total.all)} sub={`Online ${formatGMD(rev.total.online)} · Manual est. ${formatGMD(rev.total.manual)}`} />
        <Stat label="Last 30 days" value={formatGMD(rev.d30.all)} sub={`Online ${formatGMD(rev.d30.online)} · Manual est. ${formatGMD(rev.d30.manual)}`} />
        <Stat label="Last 7 days" value={formatGMD(rev.d7.all)} sub={`Online ${formatGMD(rev.d7.online)} · Manual est. ${formatGMD(rev.d7.manual)}`} />
      </div>
      <p className="mt-2 text-xs text-muted">
        &quot;Online&quot; is real money confirmed by Wave, Card and Crypto (test payments are excluded). &quot;Manual&quot; is an
        estimate for students you cleared yourself ({rev.manualCount}), from current prices and referral discounts.
        Check your own records for the exact figure.
      </p>

      <h3 className="mt-10 text-xs font-extrabold tracking-widest uppercase">Students</h3>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Students" value={String(o.totals.students)} />
        <Stat label="Paid" value={String(o.totals.cleared)} sub={`${pct(o.totals.cleared, o.totals.students)}% of signups`} />
        <Stat label="Waiting to pay" value={String(o.totals.pending)} />
        <Stat label="Signed up today" value={String(o.totals.signups_today)} />
        <Stat label="Signups, 7 days" value={String(o.totals.signups_7d)} sub={`${o.totals.cleared_7d} paid`} />
        <Stat label="Signups, 30 days" value={String(o.totals.signups_30d)} sub={`${o.totals.cleared_30d} paid`} />
      </div>

      <h3 className="mt-10 text-xs font-extrabold tracking-widest uppercase">Last 30 days</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-card border border-line bg-surface p-5">
          <p className="mb-2 flex items-center gap-2 text-xs">
            <i className="inline-block h-2.5 w-2.5" style={{ background: BLUE }} /> New signups per day
          </p>
          <Bars days={o.days} pick={(d) => d.signups} color={BLUE} label="New signups per day for the last 30 days" />
        </div>
        <div className="rounded-card border border-line bg-surface p-5">
          <p className="mb-2 flex items-center gap-2 text-xs">
            <i className="inline-block h-2.5 w-2.5" style={{ background: GREEN }} /> Students cleared per day
          </p>
          <Bars days={o.days} pick={(d) => d.cleared} color={GREEN} label="Students cleared per day for the last 30 days" />
        </div>
        <div className="rounded-card border border-line bg-surface p-5 md:col-span-2">
          <p className="mb-2 flex items-center gap-2 text-xs">
            <i className="inline-block h-2.5 w-2.5" style={{ background: GREEN }} /> Online revenue per day (dalasi)
          </p>
          <Bars days={o.days} pick={(d) => d.online_gmd} color={GREEN} label="Online revenue per day in dalasi for the last 30 days" />
        </div>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="rounded-card border border-line bg-surface p-5">
          <h3 className="text-xs font-extrabold tracking-widest uppercase">How students were cleared</h3>
          {o.methods.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No paid students yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {o.methods.map((m) => (
                <li key={m.k}>
                  <div className="flex justify-between text-xs">
                    <span>{clearedViaLabel(m.k as ClearedVia)}</span>
                    <span className="text-muted">{m.n}</span>
                  </div>
                  <div className="mt-1 h-1.5 bg-surface-2">
                    <div
                      className="h-full"
                      style={{ width: `${pct(m.n, maxMethod)}%`, background: isPayMethod(m.k) ? METHODS[m.k].bg : BLUE }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-card border border-line bg-surface p-5">
          <h3 className="text-xs font-extrabold tracking-widest uppercase">Recent activity</h3>
          {o.recent.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Nothing yet.</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {o.recent.slice(0, 10).map((r, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate">
                    <b>{r.name || "Someone"}</b>{" "}
                    <span className="text-muted">
                      {r.kind === "signup" ? "signed up" : `was cleared via ${clearedViaLabel(r.detail as ClearedVia) || "admin"}`}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">{timeAgo(r.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div id="follow-up" className="mt-10 grid gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-line bg-surface p-5">
          <h3 className="text-xs font-extrabold tracking-widest uppercase">Signed up, not paid (3+ days)</h3>
          <p className="mt-1 text-xs text-muted">{o.stale_pending.count} in total. A friendly nudge often closes the sale.</p>
          <ul className="mt-4 space-y-2 text-sm">
            {o.stale_pending.list.length === 0 && <li className="text-muted">Nobody. Nice.</li>}
            {o.stale_pending.list.map((s) => {
              const link = waLink(s.whatsapp, `Hi ${s.name || ""}, this is ${BRAND}. You signed up a few days ago. Do you need any help completing your payment?`);
              return (
                <li key={s.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">
                    {s.name || "Unnamed"} <span className="text-xs text-muted">· {timeAgo(s.created_at)}</span>
                  </span>
                  {link && (
                    <a href={link} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs font-bold text-accent hover:underline">
                      WhatsApp
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-card border border-line bg-surface p-5">
          <h3 className="text-xs font-extrabold tracking-widest uppercase">Paid but gone quiet (14+ days)</h3>
          <p className="mt-1 text-xs text-muted">{o.at_risk.count} in total. These students paid but have stopped learning.</p>
          <ul className="mt-4 space-y-2 text-sm">
            {o.at_risk.list.length === 0 && <li className="text-muted">Everyone is active.</li>}
            {o.at_risk.list.map((s) => {
              const link = waLink(s.whatsapp, `Hi ${s.name || ""}, this is ${BRAND}. We miss you in class! Is there anything we can help you with to continue your lessons?`);
              return (
                <li key={s.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">
                    {s.name || "Unnamed"}{" "}
                    <span className="text-xs text-muted">· {s.last_active ? `last seen ${timeAgo(s.last_active)}` : "never started"}</span>
                  </span>
                  {link && (
                    <a href={link} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs font-bold text-accent hover:underline">
                      WhatsApp
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </main>
  );
}
