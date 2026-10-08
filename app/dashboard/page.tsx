import { createClient } from "@/lib/supabase/server";
import { whatsappLink } from "@/lib/whatsapp";
import DashboardShell from "@/components/DashboardShell";
import Sidebar from "@/components/Sidebar";
import RealtimeRefresh from "@/components/RealtimeRefresh";
import ProgressVideo from "@/components/ProgressVideo";

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
    .select("full_name, email, learning_mode, payment_status, role")
    .eq("id", user!.id)
    .single();

  const cleared = profile?.payment_status === "cleared";
  const isAdmin = profile?.role === "admin";

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

  let videoSrc: string | null = content?.video_url ?? null;
  if (content?.video_path) {
    const { data: signed } = await supabase.storage
      .from("course-videos")
      .createSignedUrl(content.video_path, 60 * 60 * 6);
    videoSrc = signed?.signedUrl ?? null;
  }

  const waHref = whatsappLink(
    profile?.full_name ?? "",
    profile?.email ?? "",
    profile?.learning_mode ?? null
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
          name={profile?.full_name || "Trader"}
          isAdmin={isAdmin}
          unlockedIds={unlockedIds}
          completedIds={completedIds}
        />
      }
    >
      <RealtimeRefresh filter={`id=eq.${user!.id}`} />

      <div className="relative mx-auto max-w-4xl px-6 py-10">
        <h2 className="text-3xl font-black tracking-tight">{title}</h2>

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
        </div>

        {!cleared && (
          <div className="absolute inset-x-6 top-40 mx-auto max-w-md rounded-card border border-line bg-surface p-8 text-center shadow-2xl">
            <h3 className="text-xl font-black">Unlock your courses</h3>
            <p className="mt-3 text-sm text-muted">
              Complete your payment on WhatsApp. This page unlocks by itself
              as soon as we confirm it, no need to reload.
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
