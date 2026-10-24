// Loads YouTube's player script once and shares it. Browser only.

type YTPlayer = {
  getCurrentTime(): number;
  getDuration(): number;
  getPlaybackRate(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  destroy(): void;
};

type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      host?: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: { data: number; target: YTPlayer }) => void;
        onError?: (e: { data: number }) => void;
      };
    }
  ) => YTPlayer;
};

export type { YTPlayer };
export const YT_STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 } as const;

let loader: Promise<YTNamespace> | null = null;

export function loadYouTubeApi(): Promise<YTNamespace> {
  const w = window as unknown as { YT?: YTNamespace & { loaded?: number }; onYouTubeIframeAPIReady?: () => void };
  if (w.YT && w.YT.Player) return Promise.resolve(w.YT);
  if (loader) return loader;
  loader = new Promise<YTNamespace>((resolve, reject) => {
    const previous = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (w.YT) resolve(w.YT);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    tag.onerror = () => {
      loader = null;
      reject(new Error("Could not load the YouTube player. Check your internet connection."));
    };
    document.head.appendChild(tag);
  });
  return loader;
}

// ADMIN helper: asks YouTube how long a video is by loading it in a hidden player.
// Returns seconds, or null if it could not be read in time (then type the length by hand).
export async function detectYouTubeDuration(videoId: string, timeoutMs = 12000): Promise<number | null> {
  let YT: YTNamespace;
  try {
    YT = await loadYouTubeApi();
  } catch {
    return null;
  }
  return new Promise<number | null>((resolve) => {
    const holder = document.createElement("div");
    holder.style.cssText = "position:fixed;left:-9999px;top:0;width:200px;height:120px;opacity:0;pointer-events:none";
    const target = document.createElement("div");
    holder.appendChild(target);
    document.body.appendChild(holder);

    let player: YTPlayer | null = null;
    let done = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const finish = (value: number | null) => {
      if (done) return;
      done = true;
      if (timer) clearInterval(timer);
      clearTimeout(killer);
      try {
        player?.pauseVideo();
        player?.destroy();
      } catch {
        // ignore
      }
      holder.remove();
      resolve(value);
    };
    const killer = setTimeout(() => finish(null), timeoutMs);

    player = new YT.Player(target, {
      videoId,
      width: 200,
      height: 120,
      host: "https://www.youtube-nocookie.com",
      playerVars: { controls: 0, playsinline: 1, origin: window.location.origin },
      events: {
        onReady: (e) => {
          try {
            e.target.mute();
            e.target.playVideo(); // many browsers only report the length once it starts
          } catch {
            // ignore
          }
          timer = setInterval(() => {
            try {
              const d = e.target.getDuration();
              if (d && d > 1) finish(Math.round(d));
            } catch {
              // ignore
            }
          }, 300);
        },
        onError: () => finish(null),
      },
    });
  });
}
