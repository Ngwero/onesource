/** Extract a YouTube video id from watch / shorts / embed / youtu.be URLs. */
export function youtubeVideoId(url: string): string | null {
  const raw = String(url ?? "").trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id || null;
    }
    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      if (u.pathname.startsWith("/shorts/")) {
        return u.pathname.split("/")[2] || null;
      }
      if (u.pathname.startsWith("/embed/")) {
        return u.pathname.split("/")[2] || null;
      }
      const v = u.searchParams.get("v");
      if (v) return v;
    }
  } catch {
    return null;
  }
  return null;
}

export function isYouTubeUrl(url: string): boolean {
  return Boolean(youtubeVideoId(url));
}

/** Parse YouTube time tokens: `90`, `90s`, `1m30s`, `1h2m3s`. */
export function parseYouTubeTimeToken(raw: string): number {
  const t = String(raw ?? "").trim();
  if (!t) return 0;
  if (/^\d+$/.test(t)) return Math.max(0, Number(t));
  const match = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!match) return 0;
  const h = Number(match[1] || 0);
  const m = Number(match[2] || 0);
  const s = Number(match[3] || 0);
  return Math.max(0, h * 3600 + m * 60 + s);
}

/** Read start offset from `start`, `t`, or `#t=` on a YouTube URL. */
export function youtubeStartSecondsFromUrl(url: string): number {
  const raw = String(url ?? "").trim();
  if (!raw) return 0;
  try {
    const u = new URL(raw);
    const start = u.searchParams.get("start");
    if (start != null && start !== "") {
      const n = parseYouTubeTimeToken(start);
      if (n > 0 || start === "0") return n;
    }
    const t = u.searchParams.get("t");
    if (t) return parseYouTubeTimeToken(t);
    const hash = u.hash.match(/[#&?]t=([^&]+)/i);
    if (hash?.[1]) return parseYouTubeTimeToken(hash[1]);
  } catch {
    return 0;
  }
  return 0;
}

/** Prefer explicit collage startSeconds; otherwise parse from the URL. */
export function resolveYouTubeStartSeconds(
  url: string,
  startSeconds?: number | null
): number {
  if (
    typeof startSeconds === "number" &&
    Number.isFinite(startSeconds) &&
    startSeconds >= 0
  ) {
    return Math.floor(startSeconds);
  }
  return youtubeStartSecondsFromUrl(url);
}

type YoutubeEmbedOptions = {
  startSeconds?: number;
};

/**
 * Ambient hero embed: autoplay + muted + loop, no controls.
 * Mute + playsinline are required for mobile Safari autoplay.
 * Prefer youtube.com (not nocookie) — more reliable muted autoplay on iOS.
 */
export function youtubeEmbedUrl(
  url: string,
  options: YoutubeEmbedOptions = {}
): string | null {
  const id = youtubeVideoId(url);
  if (!id) return null;
  const start = resolveYouTubeStartSeconds(url, options.startSeconds);
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    muted: "1",
    loop: "1",
    playlist: id,
    playsinline: "1",
    controls: "0",
    disablekb: "1",
    fs: "0",
    rel: "0",
    modestbranding: "1",
    iv_load_policy: "3",
    cc_load_policy: "0",
    enablejsapi: "1",
  });
  if (start > 0) params.set("start", String(start));
  if (typeof window !== "undefined" && window.location?.origin) {
    params.set("origin", window.location.origin);
  }
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

/** Ask the YouTube iframe to play/mute/seek (helps mobile autoplay + loop). */
export function youtubePostCommand(
  iframe: HTMLIFrameElement | null,
  func: "playVideo" | "mute" | "unMute" | "pauseVideo" | "seekTo",
  args: unknown[] = []
) {
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(
    JSON.stringify({ event: "command", func, args }),
    "*"
  );
}

/* —— Official IFrame API (more reliable mobile autoplay) —— */

type YtPlayer = {
  mute: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
  getPlayerState?: () => number;
};

type YtPlayerEvent = { target: YtPlayer; data: number };

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: string | HTMLElement,
        opts: Record<string, unknown>
      ) => YtPlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<typeof window.YT> | null = null;

export function loadYouTubeIframeApi(): Promise<NonNullable<typeof window.YT>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("No window"));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);

  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve, reject) => {
      const done = () => {
        if (window.YT?.Player) resolve(window.YT);
        else reject(new Error("YouTube API missing Player"));
      };

      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        try {
          prev?.();
        } catch {
          /* ignore */
        }
        done();
      };

      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        script.onerror = () => reject(new Error("Failed to load YouTube API"));
        document.head.appendChild(script);
      }

      // Script may already be present / ready without firing the callback again.
      let tries = 0;
      const poll = window.setInterval(() => {
        tries += 1;
        if (window.YT?.Player) {
          window.clearInterval(poll);
          done();
        } else if (tries > 100) {
          window.clearInterval(poll);
          reject(new Error("YouTube API timeout"));
        }
      }, 50);
    });
  }

  return youtubeApiPromise as Promise<NonNullable<typeof window.YT>>;
}

export type CreateAmbientYouTubePlayerOptions = {
  element: HTMLElement;
  videoId: string;
  startSeconds?: number;
  onReady?: (player: YtPlayer) => void;
};

/** Muted looping ambient player with optional start offset. */
export async function createAmbientYouTubePlayer(
  options: CreateAmbientYouTubePlayerOptions
): Promise<YtPlayer> {
  const YT = await loadYouTubeIframeApi();
  const start = Math.max(0, Math.floor(options.startSeconds ?? 0));

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (p: YtPlayer) => {
      if (settled) return;
      settled = true;
      resolve(p);
    };

    const player = new YT.Player(options.element, {
      videoId: options.videoId,
      width: "100%",
      height: "100%",
      host: "https://www.youtube.com",
      playerVars: {
        autoplay: 1,
        mute: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        iv_load_policy: 3,
        cc_load_policy: 0,
        start,
        origin: window.location.origin,
      },
      events: {
        onReady: (event: YtPlayerEvent) => {
          try {
            event.target.mute();
            if (start > 0) event.target.seekTo(start, true);
            event.target.playVideo();
          } catch {
            /* ignore */
          }
          options.onReady?.(event.target);
          finish(event.target);
        },
        onError: () => {
          if (!settled) {
            settled = true;
            reject(new Error("YouTube player error"));
          }
        },
        onStateChange: (event: YtPlayerEvent) => {
          const ended = YT.PlayerState?.ENDED ?? 0;
          if (event.data === ended) {
            try {
              event.target.seekTo(start, true);
              event.target.mute();
              event.target.playVideo();
            } catch {
              /* ignore */
            }
          }
        },
      },
    });

    // Some mobile WebViews never fire onReady; still expose the player.
    window.setTimeout(() => finish(player), 2500);
  });
}

export function kickYouTubePlayer(player: YtPlayer | null) {
  if (!player) return;
  try {
    player.mute();
    player.playVideo();
  } catch {
    /* ignore */
  }
}
