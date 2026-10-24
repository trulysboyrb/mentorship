import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatGMD } from "@/lib/pricing";
import AdminNav from "@/components/AdminNav";
import RealtimeRefresh from "@/components/RealtimeRefresh";
import { METHODS, isPayMethod } from "@/lib/paymentMethods";
import { availability } from "@/lib/paymentConfig";

const STATUS_COLOR: Record<string, string> = {
  paid: "text-accent",
  pending: "text-muted",
  underpaid: "text-danger",
  failed: "text-danger",
  expired: "text-muted",
  cancelled: "text-muted",
};

export default async function AdminPaymentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (me?.role !== "admin") redirect("/dashboard");

  const [{ data: pays, error }, { data: events }, { data: rate }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, user_id, method, provider, status, amount_gmd, amount_usd, note, created_at, paid_at, profiles(full_name, email)")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("payment_events")
      .select("id, provider, event_type, outcome, handled, created_at, payload")
      .eq("handled", false)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.rpc("get_gmd_per_usd"),
  ]);

  const avail = availability(process.env, rate === null || rate === undefined ? null : Number(rate));
  // Needs attention: money may be involved but nothing was cleared automatically.
  const attention = (pays ?? []).filter((p) => p.status === "underpaid" || (p.status === "paid" && p.note));
  const unmatched = (events ?? []).filter((e) => e.outcome === "no_match" || e.outcome === "no_order_id" || e.outcome === "not_found");

  type Row = NonNullable<typeof pays>[number] & { profiles?: { full_name?: string; email?: string } | { full_name?: string; email?: string }[] | null };
  const who = (p: Row) => {
    const pr = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
    return { name: pr?.full_name ?? "Unknown", email: pr?.email ?? "" };
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <RealtimeRefresh table="payments" />
      <RealtimeRefresh table="payment_events" />
      <AdminNav current="/admin/payments" />
      <h2 className="mt-10 text-3xl font-black tracking-tight">Online payments</h2>
      <p className="mt-2 text-sm text-muted">
        Wave, Card and Crypto payments clear students automatically. WhatsApp payments are cleared by you on the
        Students page.
      </p>

      {error && (
        <div className="mt-6 rounded-card border border-danger bg-surface p-5 text-sm">
          <p className="font-extrabold text-danger">Payments could not be loaded.</p>
          <p className="mt-2 break-words text-muted">{error.message}</p>
          <p className="mt-2 text-muted">Run the Phase 10 SQL file once in the Supabase SQL Editor.</p>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {(["wave", "card", "crypto"] as const).map((m) => (
          <div key={m} className="border border-line bg-surface p-4" style={{ borderTop: `3px solid ${METHODS[m].bg}` }}>
            <p className="text-xs font-extrabold tracking-widest uppercase">{METHODS[m].label}</p>
            <p className={`mt-1 text-sm font-bold ${avail[m].ok ? "text-accent" : "text-danger"}`}>
              {avail[m].ok ? "Live" : "Hidden from students"}
            </p>
            {!avail[m].ok && <p className="mt-1 text-xs text-muted">{avail[m].reason}</p>}
          </div>
        ))}
      </div>

      {(attention.length > 0 || unmatched.length > 0) && (
        <div className="mt-8 rounded-card border border-danger bg-surface p-5">
          <h3 className="text-sm font-extrabold text-danger">Needs your attention</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {attention.map((p) => (
              <li key={p.id} className="text-muted">
                <span className="font-bold text-white">{who(p as Row).name}</span> · {METHODS[isPayMethod(p.method) ? p.method : "wave"].label} ·{" "}
                {p.status} · ref {p.id.slice(0, 8).toUpperCase()}: {p.note}
              </li>
            ))}
            {unmatched.map((e) => (
              <li key={e.id} className="text-muted">
                A {e.provider} message ({e.event_type}) could not be matched to a student ({e.outcome}). Check your
                provider dashboard for the money and clear the student by hand if it is theirs.
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 overflow-x-auto border border-line">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-surface text-[10px] tracking-widest text-muted uppercase">
            <tr>
              {["Student", "Method", "Amount", "Status", "Ref", "Started"].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(pays ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No online payments yet.
                </td>
              </tr>
            )}
            {(pays ?? []).map((p) => {
              const w = who(p as Row);
              const m = isPayMethod(p.method) ? METHODS[p.method] : null;
              return (
                <tr key={p.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <span className="font-bold">{w.name}</span>
                    <span className="block text-xs text-muted">{w.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="mr-2 inline-block h-2.5 w-2.5" style={{ background: m?.bg }} />
                    {m?.label ?? p.method}
                    {p.provider === "mock" && <span className="ml-2 text-[10px] text-danger uppercase">test</span>}
                  </td>
                  <td className="px-4 py-3">
                    {formatGMD(p.amount_gmd)}
                    {p.amount_usd !== null && <span className="block text-xs text-muted">${Number(p.amount_usd).toFixed(2)}</span>}
                  </td>
                  <td className={`px-4 py-3 font-bold uppercase ${STATUS_COLOR[p.status] ?? ""}`}>{p.status}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{p.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-4 py-3 text-xs text-muted">{new Date(p.created_at).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
