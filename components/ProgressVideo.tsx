"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const THRESHOLD = 0.9; // must match the 0.9 in report_progress() in the database
const REPORT_EVERY_MS = 10000;

export default function ProgressVideo({
  src,
  lessonId,
  duration,
  initialWatched,
  initialPosition,
  completed,
  track,
  nextHref,
}: {
  src: string;
  lessonId: string;
  duration: number | null;
  initialWatched: number;
  initialPosition: number;
  completed: boolean;
  track: boolean;
  nextHref: string | null;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stableSrc] = useState(src); // never changes, so refreshes don't restart playback
  const [dur, setDur] = useState<number | null>(duration);
  const [watched, setWatched] = useState(initialWatched);
  const [done, setDone] = useState(completed);

  const doneRef = useRef(completed);
  const pending = useRef(0);
  const lastTime = useRef(0);
  const posRef = useRef(0);
  const durRef = useRef(0);
  const sending = useRef(false);

  async function flush() {
    if (!track || doneRef.current || sending.current) return;
    const played = pending.current;
    if (played < 0.5) return;
    pending.current = 0;
    sending.current = true;

    const { data, error } = await createClient().rpc("report_progress", {
      p_lesson: lessonId,
      p_position: posRef.current,
      p_played: played,
      p_duration: durRef.current,
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
    const id = setInterval(flush, REPORT_EVERY_MS);
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = done
    ? 100
    : dur
      ? Math.min(99, (watched / (dur * THRESHOLD)) * 100)
      : 0;

  return (
    <>
      <div className="aspect-video overflow-hidden rounded-card border border-line bg-[#000]">
        <video
          ref={videoRef}
          src={stableSrc}
          controls
          controlsList="nodownload"
          preload="metadata"
          className="h-full w-full"
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            durRef.current = v.duration || 0;
            if (!dur && v.duration) setDur(v.duration);
            if (!doneRef.current && initialPosition > 0 && initialPosition < v.duration - 5) {
              v.currentTime = initialPosition;
            }
            lastTime.current = v.currentTime;
          }}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            const delta = v.currentTime - lastTime.current;
            lastTime.current = v.currentTime;
            posRef.current = v.currentTime;
            // Only count normal playback, not skipping around.
            if (!v.paused && !v.seeking && delta > 0 && delta < 2 && !doneRef.current) {
              pending.current += delta;
              setWatched((w) => w + delta);
            }
          }}
          onSeeked={(e) => {
            lastTime.current = e.currentTarget.currentTime;
          }}
          onPause={() => flush()}
          onEnded={() => flush()}
        />
      </div>

      <div className="h-1 w-full bg-line">
        <div
          className="h-1 bg-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

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
        ) : (
          <span className="text-muted">
            Watch the lesson to unlock the next one. Skipping ahead does not count.
          </span>
        )}
      </div>
    </>
  );
}
