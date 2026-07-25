import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchKitchenCollage } from "../../api/client";
import type { KitchenCollage } from "../../types/kitchenCollage";
import { resolveImageUrl } from "../../utils/imageUrl";
import {
  createAmbientYouTubePlayer,
  isDirectVideoUrl,
  isYouTubeUrl,
  kickYouTubePlayer,
  resolveYouTubeStartSeconds,
  youtubeEmbedUrl,
  youtubePlayerPixelSize,
  youtubePosterUrl,
  youtubePostCommand,
  youtubePostDisableCaptions,
  youtubeVideoId,
  type YtPlayer,
} from "../../utils/youtube";

/**
 * 0 hero | 1 mid-top | 2 mid-bottom
 * 3–6 right 2×2 (TL, TR, BL, BR)
 */
const SLOT_CLASS = [
  "kitchen-collage-slot kitchen-collage-slot--hero",
  "kitchen-collage-slot kitchen-collage-slot--a",
  "kitchen-collage-slot kitchen-collage-slot--b",
  "kitchen-collage-slot kitchen-collage-slot--r1",
  "kitchen-collage-slot kitchen-collage-slot--r2",
  "kitchen-collage-slot kitchen-collage-slot--r3",
  "kitchen-collage-slot kitchen-collage-slot--r4",
] as const;

function preferMobileYouTubeEmbed() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(
    "(max-width: 639px), (hover: none) and (pointer: coarse)"
  ).matches;
}

/** Native MP4/WebM — muted + playsInline autoplays on iPhone (YouTube often cannot). */
function CollageNativeVideo({
  url,
  title,
  className,
  startSeconds,
}: {
  url: string;
  title: string;
  className: string;
  startSeconds?: number | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const src = resolveImageUrl(url);
  const start = Math.max(0, Math.floor(Number(startSeconds) || 0));

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const play = async () => {
      try {
        el.muted = true;
        el.defaultMuted = true;
        el.playsInline = true;
        el.setAttribute("muted", "");
        el.setAttribute("playsinline", "");
        el.setAttribute("webkit-playsinline", "");
        if (start > 0 && Number.isFinite(el.duration) && el.duration > start) {
          el.currentTime = start;
        }
        await el.play();
      } catch {
        /* Low Power Mode / policy — retry on gesture */
      }
    };

    const onMeta = () => {
      if (start > 0) {
        try {
          el.currentTime = start;
        } catch {
          /* ignore */
        }
      }
      void play();
    };

    el.addEventListener("loadedmetadata", onMeta);
    void play();

    const kick = () => void play();
    const events = ["touchstart", "touchend", "pointerdown", "click"] as const;
    for (const evt of events) {
      document.addEventListener(evt, kick, { passive: true });
    }
    const onVisible = () => {
      if (document.visibilityState === "visible") void play();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      el.removeEventListener("loadedmetadata", onMeta);
      document.removeEventListener("visibilitychange", onVisible);
      for (const evt of events) {
        document.removeEventListener(evt, kick);
      }
    };
  }, [src, start]);

  return (
    <div className={`${className} kitchen-collage-slot--video`}>
      <video
        ref={videoRef}
        className="kitchen-collage-video kitchen-collage-video--native"
        src={src}
        title={title}
        autoPlay
        muted
        playsInline
        loop
        preload="auto"
        controls={false}
        disablePictureInPicture
      />
      <div className="kitchen-collage-video-shield" aria-hidden="true" />
    </div>
  );
}

/**
 * Mobile: plain muted iframe + gesture re-load (YT API often never autoplays on iOS).
 * Desktop: IFrame API at large pixel size for sharper HD.
 */
function CollageYouTubeVideo({
  url,
  title,
  className,
  startSeconds,
}: {
  url: string;
  title: string;
  className: string;
  startSeconds?: number | null;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<YtPlayer | null>(null);
  const kickRef = useRef<() => void>(() => {});
  const unlockedRef = useRef(false);
  const [useApi, setUseApi] = useState(() => !preferMobileYouTubeEmbed());

  const videoId = youtubeVideoId(url);
  const start = resolveYouTubeStartSeconds(url, startSeconds);
  const embedSrc = youtubeEmbedUrl(url, { startSeconds: start });
  const poster = youtubePosterUrl(url);

  // Desktop / large screens: YouTube IFrame API
  useEffect(() => {
    if (!useApi || !videoId || !hostRef.current) return;

    let cancelled = false;
    let player: YtPlayer | null = null;
    const host = hostRef.current;
    const mount = document.createElement("div");
    mount.className = "kitchen-collage-video";
    mount.setAttribute("title", title);
    host.appendChild(mount);

    const { width, height } = youtubePlayerPixelSize(host);

    createAmbientYouTubePlayer({
      element: mount,
      videoId,
      startSeconds: start,
      width,
      height,
    })
      .then((p) => {
        if (cancelled) {
          p.destroy();
          return;
        }
        player = p;
        playerRef.current = p;
        kickYouTubePlayer(p);
      })
      .catch(() => {
        if (!cancelled) setUseApi(false);
      });

    const kick = () => kickYouTubePlayer(playerRef.current);
    kickRef.current = kick;

    const onVisible = () => {
      if (document.visibilityState === "visible") kick();
    };
    const gestureEvents = [
      "touchstart",
      "touchend",
      "pointerdown",
      "click",
    ] as const;
    for (const evt of gestureEvents) {
      document.addEventListener(evt, kick, { passive: true, capture: true });
    }
    document.addEventListener("visibilitychange", onVisible);

    const keepAlive = window.setInterval(() => {
      if (document.visibilityState === "visible") kick();
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(keepAlive);
      document.removeEventListener("visibilitychange", onVisible);
      for (const evt of gestureEvents) {
        document.removeEventListener(evt, kick, true);
      }
      try {
        player?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
      host.replaceChildren();
    };
  }, [useApi, videoId, start, title]);

  // Mobile / fallback: direct embed. Re-assign src inside a real touch gesture.
  useEffect(() => {
    if (useApi || !embedSrc) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const play = () => {
      youtubePostCommand(iframe, "mute");
      youtubePostDisableCaptions(iframe);
      youtubePostCommand(iframe, "playVideo");
    };

    const unlock = () => {
      // Critical for iOS: bind a fresh autoplay load to a user gesture.
      if (!unlockedRef.current) {
        unlockedRef.current = true;
        const join = embedSrc.includes("?") ? "&" : "?";
        iframe.src = `${embedSrc}${join}cb=${Date.now()}`;
      }
      play();
    };
    kickRef.current = unlock;

    const onLoad = () => {
      youtubePostCommand(iframe, "mute");
      youtubePostDisableCaptions(iframe);
      if (start > 0) youtubePostCommand(iframe, "seekTo", [start, true]);
      youtubePostCommand(iframe, "playVideo");
      window.setTimeout(play, 250);
      window.setTimeout(play, 800);
      window.setTimeout(play, 1600);
    };
    iframe.addEventListener("load", onLoad);

    // Try without gesture first (Android / desktop often OK).
    play();

    const gestureEvents = [
      "touchstart",
      "touchend",
      "pointerdown",
      "click",
    ] as const;
    for (const evt of gestureEvents) {
      document.addEventListener(evt, unlock, { passive: true, capture: true });
    }
    const onVisible = () => {
      if (document.visibilityState === "visible") play();
    };
    document.addEventListener("visibilitychange", onVisible);

    const keepAlive = window.setInterval(() => {
      if (document.visibilityState === "visible") play();
    }, 4000);

    return () => {
      iframe.removeEventListener("load", onLoad);
      window.clearInterval(keepAlive);
      document.removeEventListener("visibilitychange", onVisible);
      for (const evt of gestureEvents) {
        document.removeEventListener(evt, unlock, true);
      }
    };
  }, [useApi, embedSrc, start]);

  return (
    <div className={`${className} kitchen-collage-slot--video`}>
      {poster ? (
        <img
          className="kitchen-collage-video-poster"
          src={poster}
          alt=""
          decoding="async"
          fetchPriority="high"
        />
      ) : null}
      {useApi ? (
        <div ref={hostRef} className="kitchen-collage-video-host" />
      ) : embedSrc ? (
        <iframe
          ref={iframeRef}
          className="kitchen-collage-video"
          src={embedSrc}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; muted"
          allowFullScreen={false}
          loading="eager"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : null}
      <div
        className="kitchen-collage-video-shield"
        aria-hidden="true"
        onTouchStart={() => kickRef.current()}
        onClick={() => kickRef.current()}
      />
    </div>
  );
}

function CollageCell({
  url,
  alt,
  href,
  className,
  priority,
  allowVideo,
  startSeconds,
}: {
  url: string;
  alt: string;
  href?: string;
  className: string;
  priority?: boolean;
  allowVideo?: boolean;
  startSeconds?: number | null;
}) {
  if (allowVideo && isDirectVideoUrl(url)) {
    return (
      <CollageNativeVideo
        url={url}
        title={alt}
        className={className}
        startSeconds={startSeconds}
      />
    );
  }

  if (allowVideo && isYouTubeUrl(url)) {
    return (
      <CollageYouTubeVideo
        url={url}
        title={alt}
        className={className}
        startSeconds={startSeconds}
      />
    );
  }

  const src = resolveImageUrl(url);
  const media = (
    <img
      className="kitchen-collage-photo"
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      referrerPolicy="no-referrer"
      sizes="(max-width: 639px) 50vw, (max-width: 899px) 33vw, 25vw"
    />
  );

  if (href) {
    return (
      <Link to={href} className={className} aria-label={alt}>
        {media}
      </Link>
    );
  }

  return <div className={className}>{media}</div>;
}

export function KitchenInspirationCollage() {
  const { t } = useTranslation();
  const [collage, setCollage] = useState<KitchenCollage | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchKitchenCollage()
      .then((data) => {
        if (!cancelled) setCollage(data);
      })
      .catch(() => {
        if (!cancelled) setCollage(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!collage || collage.active === false) return null;

  const images = collage.images.slice(0, 7);
  if (images.every((img) => !img.url)) return null;

  return (
    <section
      className="kitchen-collage"
      aria-label={collage.introTitle || t("kitchen.brand")}
    >
      <div className="kitchen-collage-grid">
        {images.map((img, index) =>
          img.url ? (
            <CollageCell
              key={`${img.url}-${img.startSeconds ?? ""}-${index}`}
              url={img.url}
              alt={img.alt || collage.introTitle || t("kitchen.brand")}
              href={img.href || undefined}
              className={SLOT_CLASS[index] ?? "kitchen-collage-slot"}
              priority={index < 4}
              allowVideo={
                index === 0 || isYouTubeUrl(img.url) || isDirectVideoUrl(img.url)
              }
              startSeconds={img.startSeconds}
            />
          ) : null
        )}
      </div>
    </section>
  );
}
