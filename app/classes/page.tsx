import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkDevice } from "@/lib/device";
import TopBar from "@/components/TopBar";
import { avatarUrl } from "@/lib/avatar";
import ClassList from "@/components/ClassList";
import RealtimeRefresh from "@/components/RealtimeRefresh";
import type { ClassRow } from "@/lib/classes";

export default async function ClassesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, payment_status, avatar_path, learning_mode")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/dashboard");

  const isAdmin = profile.role === "admin";
  if (!isAdmin && (profile.learning_mode === "in_person" || profile.learning_mode === "group")) redirect("/pending");
  if (profile.payment_status !== "cleared" && !isAdmin) redirect("/dashboard");
  if (!isAdmin && (await checkDevice(supabase)) === "limit") redirect("/device-limit");

  const [{ data: classes, error }, { data: reminderRows }] = await Promise.all([
    supabase
      .from("live_classes")
      .select("id, title, description, starts_at, duration_minutes, kind, join_url, location")
      .order("starts_at", { ascending: true }),
    supabase.from("class_reminders").select("class_id").eq("user_id", user.id),
  ]);

  return (
    <>
      <TopBar
        fullName={profile.full_name}
        avatarUrl={avatarUrl(profile.avatar_path)}
        isAdmin={isAdmin}
        showTools
        left={
          <Link href="/dashboard" className="text-muted hover:text-white">
            Back to courses
          </Link>
        }
      />
      <RealtimeRefresh table="live_classes" />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-4xl font-black tracking-tight">Live classes</h1>
        <p className="mt-3 text-sm text-muted">
          Join live sessions with us and set a reminder so you never miss one.
        </p>
        {error ? (
          <p className="mt-6 break-words text-sm text-danger">
            Could not load classes: {error.message}. Did you run the Phase 9 SQL?
          </p>
        ) : (
          <ClassList
            classes={(classes ?? []) as ClassRow[]}
            reminders={(reminderRows ?? []).map((r) => r.class_id)}
            userId={user.id}
          />
        )}
      </main>
    </>
  );
}
