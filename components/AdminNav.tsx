import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import RealtimeRefresh from "@/components/RealtimeRefresh";
import PaletteButton from "@/components/PaletteButton";

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

// Top of every admin page. It stays in view while you scroll, shows a red alert when students are
// waiting for a payout, and refreshes by itself the moment a new request comes in.
export default async function AdminNav({ current }: { current: string }) {
  let waiting = 0;
  try {
    const { data } = await (await createClient()).rpc("admin_open_payouts");
    waiting = typeof data === "number" ? data : 0;
  } catch {
    waiting = 0;
  }

  return (
    <>
      <RealtimeRefresh table="payout_requests" />
      <header className="sticky top-0 z-40 -mx-6 border-b border-line bg-bg/85 px-6 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-lg font-black tracking-tight text-accent">ADMIN</h1>
          <div className="flex items-center gap-3">
            <PaletteButton />
            <Link href="/dashboard" className="hidden text-xs text-accent hover:underline sm:block">
              Student area
            </Link>
            <SignOutButton />
          </div>
        </div>
        <nav aria-label="Admin sections" className="-mx-1 mt-3 flex gap-1 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
          {LINKS.map(([href, label]) => {
            const on = current === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                className={`nav-link relative shrink-0 px-3 py-1.5 text-xs whitespace-nowrap transition-colors ${
                  on ? "font-semibold text-white" : "text-muted hover:text-white"
                }`}
              >
                {label}
                {href === "/admin/payouts" && waiting > 0 && (
                  <span className="ml-1.5 rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                    {waiting}
                  </span>
                )}
                <span
                  className={`absolute inset-x-3 -bottom-px h-0.5 origin-left bg-accent transition-transform duration-300 ${
                    on ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </Link>
            );
          })}
        </nav>
      </header>

      {waiting > 0 && current !== "/admin/payouts" && (
        <Link
          href="/admin/payouts"
          className="anim-fade-up mt-5 block rounded-card border border-danger bg-surface px-4 py-3 text-sm hover:bg-surface-2"
        >
          <span className="font-extrabold text-danger">
            {waiting} payout request{waiting === 1 ? "" : "s"} waiting.
          </span>{" "}
          <span className="text-muted">Tap to see who to pay.</span>
        </Link>
      )}
    </>
  );
}
