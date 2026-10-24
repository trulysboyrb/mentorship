import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import RealtimeRefresh from "@/components/RealtimeRefresh";

const LINKS: [string, string][] = [
  ["/admin/overview", "Overview"],
  ["/admin", "Students"],
  ["/admin/courses", "Courses"],
  ["/admin/quizzes", "Quizzes"],
  ["/admin/notes", "Notes"],
  ["/admin/classes", "Live classes"],
  ["/admin/announcements", "Announcements"],
  ["/admin/questions", "Questions"],
  ["/admin/payments", "Payments"],
  ["/admin/payouts", "Payouts"],
  ["/admin/analytics", "Analytics"],
  ["/admin/settings", "Settings"],
];

// Top of every admin page. Shows a red alert when students are waiting for a payout,
// and refreshes by itself the moment a new request comes in.
export default async function AdminNav({ current }: { current: string }) {
  let waiting = 0;
  try {
    const { data } = await (await createClient()).rpc("admin_open_payouts");
    waiting = typeof data === "number" ? data : 0;
  } catch {
    waiting = 0;
  }

  return (
    <header>
      <RealtimeRefresh table="payout_requests" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-black text-accent">ADMIN</h1>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {LINKS.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={`text-xs ${
                current === href ? "font-semibold text-white" : "text-muted hover:text-white"
              }`}
            >
              {label}
              {href === "/admin/payouts" && waiting > 0 && (
                <span className="ml-1.5 rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                  {waiting}
                </span>
              )}
            </Link>
          ))}
          <Link href="/dashboard" className="text-xs text-accent hover:underline">
            Student area
          </Link>
          <SignOutButton />
        </nav>
      </div>

      {waiting > 0 && current !== "/admin/payouts" && (
        <Link
          href="/admin/payouts"
          className="mt-5 block rounded-card border border-danger bg-surface px-4 py-3 text-sm hover:bg-surface-2"
        >
          <span className="font-extrabold text-danger">
            {waiting} payout request{waiting === 1 ? "" : "s"} waiting.
          </span>{" "}
          <span className="text-muted">Tap to see who to pay.</span>
        </Link>
      )}
    </header>
  );
}
