import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkDevice } from "@/lib/device";
import { whatsappLink } from "@/lib/whatsapp";
import { REFERRAL_DISCOUNT_PERCENT, formatGMD, priceFor } from "@/lib/pricing";
import DashboardShell from "@/components/DashboardShell";
import Sidebar from "@/components/Sidebar";
import RealtimeRefresh from "@/components/RealtimeRefresh";
import ProgressVideo from "@/components/ProgressVideo";
import Announcements from "@/components/Announcements";
import LessonComments from "@/components/LessonComments";
import TopBar from "@/components/TopBar";

const RESOURCES = [
  { name: "TradingView", tag: "Charts", url: "https://www.tradingview.com" },
  { name: "Forex Factory", tag: "News", url: "https://www.forexfactory.com" },
];

const VideoBox = ({ children }: { children?: React.ReactNode }) => (
  <>
    <div className="aspect-video overflow-hidden rounded-card border border-line bg-black">
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted">
        {children}
      </div>
    </div>
    <div className="h-1 w-full bg-line" />
  </>
);

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { lesson: lessonId } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, learning_mode, payment_status, role, referral_discount")
    .eq("id", user!.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const cleared = isAdmin || profile?.payment_status === "cleared";

  // Paid students can use up to the allowed number of devices. Admins are never limited.
  if (!isAdmin && cleared && (await checkDevice(supabase)) === "limit") {
    redirect("/device-limit");
  }

  const [{ data: modulesRaw }, { data: unlockedRaw }, { data: progressRows }] =
    await Promise.all([
      supabase
        .from("modules")
        .select("id, position, title, lessons(id, position, title)")
        .order("position")
        .order("position", { referencedTable: "lessons" }),
      supabase.rpc("unlocked_lessons"),
      supabase
        .from("lesson_progress")
        .select("lesson_id, watched_seconds, last_position, completed")
        .eq("user_id", user!.id),
    ]);

  const modules = modulesRaw ?? [];
  const flat = modules.flatMap((m) => m.lessons);
  const lesson = flat.find((l) => l.id === lessonId);
  const nextLesson = lesson ? flat[flat.indexOf(lesson) + 1] : undefined;

  const unlockedIds = (unlockedRaw ?? []) as string[];
  const completedIds = (progressRows ?? []).filter((p) => p.completed).map((p) => p.lesson_id);
  const progress = (progressRows ?? []).find((p) => p.lesson_id === lesson?.id);
  const lessonUnlocked = !!lesson && unlockedIds.includes(lesson.id);

  // Locked at the database level: nothing comes back for locked lessons.
  const { data: content } =
    cleared && lesson && lessonUnlocked
      ? await supabase
          .from("lesson_content")
          .select("video_url, video_path, duration_seconds, notes")
          .eq("lesson_id", lesson.id)
          .maybeSingle()
      : { data: null };

  const { data: announcements } = cleared
    ? await supabase
        .from("announcements")
        .select("id, title, body, created_at")
        .order("created_at", { ascending: false })
        .limit(3)
    : { data: null };

  const { data: comments } =
    cleared && lesson && lessonUnlocked
      ? await supabase
          .from("lesson_comments")
          .select("id, parent_id, user_id, author_name, is_staff, body, created_at")
          .eq("lesson_id", lesson.id)
          .order("created_at", { ascending: true })
      : { data: null };

  let videoSrc: string | null = content?.video_url ?? null;
  if (content?.video_path) {
    const { data: signed } = await supabase.storage
      .from("course-videos")
      .createSignedUrl(content.video_path, 60 * 60 * 6);
    videoSrc = signed?.signedUrl ?? null;
  }

  const referred = !!profile?.referral_discount;
  const price = priceFor(profile?.learning_mode, referred);
  const waHref = whatsappLink(
    profile?.full_name ?? "",
    profile?.email ?? "",
    profile?.learning_mode ?? null,
    { referred }
  );

  const title = !cleared
    ? "Your courses are locked"
    : lesson
      ? lesson.title
      : "Select a lesson to begin";

  return (
    <DashboardShell
      sidebar={
        <Sidebar
          modules={modules}
          cleared={cleared}
          activeId={lesson?.id}
          unlockedIds={unlockedIds}
          completedIds={completedIds}
        />
      }
    >
      <TopBar
        fullName={profile?.full_name ?? ""}
        isAdmin={isAdmin}
        showTools={cleared}
      />
      <RealtimeRefresh filter={`id=eq.${user!.id}`} />
      {cleared && <RealtimeRefresh table="announcements" />}
      {cleared && lesson && lessonUnlocked && (
        <RealtimeRefresh table="lesson_comments" filter={`lesson_id=eq.${lesson.id}`} />
      )}

      <div className="relative mx-auto max-w-4xl px-6 py-10">
        <h2 className="text-3xl font-black tracking-tight">{title}</h2>

        {cleared && announcements && announcements.length > 0 && (
          <Announcements items={announcements} />
        )}

        <div className={`mt-6 space-y-6 ${cleared ? "" : "pointer-events-none blur-sm select-none"}`}>
          <div className="space-y-3">
            {!lesson ? (
              <VideoBox />
            ) : !lessonUnlocked ? (
              <VideoBox>Finish the previous lesson to unlock this one.</VideoBox>
            ) : videoSrc ? (
              <ProgressVideo
                key={`${lesson.id}-${content?.video_path ?? content?.video_url}`}
                src={videoSrc}
                lessonId={lesson.id}
                duration={content?.duration_seconds ?? null}
                initialWatched={progress?.watched_seconds ?? 0}
                initialPosition={progress?.last_position ?? 0}
                completed={progress?.completed ?? false}
                track={!isAdmin}
                nextHref={nextLesson ? `/dashboard?lesson=${nextLesson.id}` : null}
              />
            ) : (
              <VideoBox>Video coming soon</VideoBox>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-card border border-line bg-surface p-6 md:col-span-2">
              <h3 className="text-xs font-extrabold tracking-widest uppercase">Lesson notes</h3>
              <p className="mt-4 text-sm leading-relaxed whitespace-pre-wrap text-white/70">
                {content?.notes ?? "Welcome, Trader. Open the menu to select your lesson."}
              </p>
            </div>
            <div className="rounded-card border border-line bg-surface p-6">
              <h3 className="text-[10px] font-extrabold tracking-widest text-accent uppercase">Resources</h3>
              <ul className="mt-4 space-y-3">
                {RESOURCES.map((r) => (
                  <li key={r.name}>
                    <a href={r.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-control border border-line bg-surface-2 px-4 py-3 text-sm font-semibold hover:border-accent">
                      {r.name}
                      <span className="text-[10px] font-normal text-muted">{r.tag}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {cleared && lesson && lessonUnlocked && (
            <LessonComments
              lessonId={lesson.id}
              comments={comments ?? []}
              userId={user!.id}
              isAdmin={isAdmin}
            />
          )}
        </div>

        {!cleared && (
          <div className="absolute inset-x-6 top-40 mx-auto max-w-md rounded-card border border-line bg-surface p-8 text-center shadow-2xl">
            <h3 className="text-xl font-black">Unlock your courses</h3>
            <p className="mt-3 text-sm text-muted">
              Complete your payment on WhatsApp. This page unlocks by itself
              as soon as we confirm it, no need to reload.
            </p>
            <p className="mt-4 text-sm">
              <span className="text-muted">Your price: </span>
              <span className="font-bold">{formatGMD(price.final)}</span>
              {referred && (
                <span className="mt-1 block text-xs text-accent">
                  {REFERRAL_DISCOUNT_PERCENT}% referral discount applied
                </span>
              )}
            </p>
            <a href={waHref} target="_blank" rel="noopener noreferrer"
              className="mt-6 block rounded-control bg-accent px-6 py-3.5 text-xs font-extrabold tracking-wider text-black uppercase">
              Pay via WhatsApp
            </a>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
