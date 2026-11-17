"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loadYouTubeApi, YT_STATE, type YTPlayer } from "@/lib/youtubeApi";

const THRESHOLD = 0.9; // must match the 0.9 in report_progress() in the database
const REPORT_EVERY_MS = 10000;
const POLL_MS = 500;

// A YouTube (unlisted) lesson with the same "watch it to unlock the next one" rules as uploaded videos.
export default function YouTubeProgress({
  videoId,
  lessonId,
  duration,
  initialWatched,
  initialPosition,
  completed,
  track,
  nextHref,
}: {
  videoId: string;
  lessonId: string;
  duration: number | null;
  initialWatched: number;
  initialPosition: number;
  completed: boolean;
  track: boolean;
  nextHref: string | null;
}) {
  const router = useRouter();
  const holderRef = useRef<HTMLDivElement>(null);
  const [watched, setWatched] = useState(initialWatched);
  const [done, setDone] = useState(completed);
  const [loadError, setLoadError] = useState("");

  const doneRef = useRef(completed);
  const pending = useRef(0);
  const lastTime = useRef(0);
  const posRef = useRef(0);
  const sending = useRef(false);
  const playerRef = useRef<YTPlayer | null>(null);
  const playing = useRef(false);

  const canTrack = track && !!duration && duration > 0;

  async function flush() {
    if (!canTrack || doneRef.current || sending.current) return;
    const played = pending.current;
    if (played < 0.5) return;
    pending.current = 0;
    sending.current = true;

    const { data, error } = await createClient().rpc("report_progress", {
      p_lesson: lessonId,
      p_position: posRef.current,
      p_played: played,
      p_duration: duration ?? 0,
    });
    sending.current = false;

    if (error) {
      pending.current += played; // try again on the next report
      return;
    }
    if (data?.completed) {
      doneRef.current = true;
      setDone(true);
      router.refresh(); // unlocks the next lesson in the sidebar
    }
  }

  useEffect(() => {
    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | undefined;
    const holder = holderRef.current;
    if (!holder) return;
    const mount = document.createElement("div");
    holder.appendChild(mount);

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        const start = !doneRef.current && initialPosition > 5 && (!duration || initialPosition < duration - 5)
          ? Math.floor(initialPosition)
          : 0;
        playerRef.current = new YT.Player(mount, {
          videoId,
          width: "100%",
          height: "100%",
          host: "https://www.youtube-nocookie.com",
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            iv_load_policy: 3,
            origin: window.location.origin,
            start,
          },
          events: {
            onReady: (e) => {
              lastTime.current = e.target.getCurrentTime();
            },
            onStateChange: (e) => {
              if (e.data === YT_STATE.PLAYING) {
                playing.current = true;
                lastTime.current = e.target.getCurrentTime();
              } else {
                playing.current = false;
                if (e.data === YT_STATE.PAUSED || e.data === YT_STATE.ENDED) flush();
              }
            },
            onError: () => setLoadError("This video could not be played. Please tell support."),
          },
        });

        poll = setInterval(() => {
          const p = playerRef.current;
          if (!p || !playing.current) return;
          let t = 0;
          try {
            t = p.getCurrentTime();
          } catch {
            return;
          }
          const delta = t - lastTime.current;
          lastTime.current = t;
          posRef.current = t;
          // Only normal playback counts (even at 2x). Jumping around does not.
          if (delta > 0 && delta < 2.5 && !doneRef.current) {
            pending.current += delta;
            setWatched((w) => w + delta);
          }
        }, POLL_MS);
      })
      .catch((e: Error) => setLoadError(e.message));

    const id = setInterval(flush, REPORT_EVERY_MS);
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
      flush();
      try {
        playerRef.current?.destroy();
      } catch {
        // ignore
      }
      playerRef.current = null;
      holder.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = done ? 100 : duration ? Math.min(99, (watched / (duration * THRESHOLD)) * 100) : 0;

  return (
    <>
      <div className="relative aspect-video overflow-hidden rounded-card border border-line bg-[#000]">
        <div ref={holderRef} className="absolute inset-0 [&>iframe]:h-full [&>iframe]:w-full" />
        {loadError && (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted">
            {loadError}
          </p>
        )}
      </div>

      {track && (
        <div className="h-1 w-full bg-line">
          <div className="h-1 bg-accent transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      )}

      <div className="flex items-center justify-between text-xs">
        {done ? (
          <>
            <span className="font-semibold text-accent">Lesson completed</span>
            {nextHref && (
              <Link href={nextHref} className="font-semibold text-white hover:text-accent">
                Next lesson
              </Link>
            )}
          </>
        ) : track && !canTrack ? (
          <span className="text-muted">
            This lesson is still being set up, so your progress cannot be saved yet. Please message support.
          </span>
        ) : track ? (
          <span className="text-muted">Watch the lesson to unlock the next one. Skipping ahead does not count.</span>
        ) : (
          <span className="text-muted">Admin preview. Progress is not tracked.</span>
        )}
      </div>
    </>
  );
}
