import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkDevice } from "@/lib/device";
import TopBar from "@/components/TopBar";
import SessionClock from "@/components/SessionClock";
import RiskCalculator from "@/components/RiskCalculator";
import EconomicCalendar from "@/components/EconomicCalendar";

export default async function ToolsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, payment_status")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/dashboard");

  const isAdmin = profile.role === "admin";
  const cleared = profile.payment_status === "cleared";
  // Tools are a perk for paid students (and admin).
  if (!cleared && !isAdmin) redirect("/dashboard");
  if (!isAdmin && (await checkDevice(supabase)) === "limit") redirect("/device-limit");

  return (
    <>
      <TopBar
        fullName={profile.full_name}
        isAdmin={isAdmin}
        showTools
        left={
          <Link href="/dashboard" className="text-muted hover:text-white">
            Back to courses
          </Link>
        }
      />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-4xl font-black tracking-tight">Market tools</h1>
        <p className="mt-3 text-sm text-muted">
          Session times, a position size calculator and the economic calendar. For learning only,
          not financial advice.
        </p>

        <SessionClock />
        <RiskCalculator />
        <EconomicCalendar />
      </main>
    </>
  );
}
