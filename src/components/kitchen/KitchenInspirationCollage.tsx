import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchKitchenCollage } from "../../api/client";
import type { KitchenCollage } from "../../types/kitchenCollage";
import { resolveImageUrl } from "../../utils/imageUrl";
import {
  createAmbientYouTubePlayer,
  isYouTubeUrl,
  kickYouTubePlayer,
  resolveYouTubeStartSeconds,
  youtubeEmbedUrl,
  youtubePlayerPixelSize,
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

function CollageVideo({
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
  const [useApi, setUseApi] = useState(true);

  const videoId = youtubeVideoId(url);
  const start = resolveYouTubeStartSeconds(url, startSeconds);
  const fallbackSrc = youtubeEmbedUrl(url, { startSeconds: start });

  // Prefer official IFrame API — muted autoplay is more reliable on iOS.
  useEffect(() => {
    if (!useApi || !videoId || !hostRef.current) return;

    let cancelled = false;
    let player: YtPlayer | null = null;
    const host = hostRef.current;
    const mount = document.createElement("div");
    mount.className = "kitchen-collage-video";
    mount.setAttribute("title", title);
    host.appendChild(mount);

    // Large pixel player → YouTube serves HD; CSS crops without upscaling blur.
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

    // iOS often needs a page gesture before the iframe will actually play.
    const gestureEvents = [
      "touchstart",
      "touchend",
      "pointerdown",
      "click",
      "scroll",
    ] as const;
    for (const evt of gestureEvents) {
      document.addEventListener(evt, kick, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", kick);
    window.addEventListener("focus", kick);

    const keepAlive = window.setInterval(() => {
      if (document.visibilityState === "visible") kick();
    }, 3500);

    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              if (entries.some((e) => e.isIntersecting)) kick();
            },
            { threshold: 0.15 }
          )
        : null;
    io?.observe(host);

    return () => {
      cancelled = true;
      window.clearInterval(keepAlive);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", kick);
      window.removeEventListener("focus", kick);
      for (const evt of gestureEvents) {
        document.removeEventListener(evt, kick);
      }
      io?.disconnect();
      try {
        player?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
      host.replaceChildren();
    };
  }, [useApi, videoId, start, title]);

  // Fallback: plain embed + postMessage kicks
  useEffect(() => {
    if (useApi || !fallbackSrc) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const play = () => {
      youtubePostCommand(iframe, "mute");
      youtubePostDisableCaptions(iframe);
      youtubePostCommand(iframe, "playVideo");
    };
    kickRef.current = play;

    const onLoad = () => {
      youtubePostCommand(iframe, "mute");
      youtubePostDisableCaptions(iframe);
      if (start > 0) youtubePostCommand(iframe, "seekTo", [start, true]);
      youtubePostCommand(iframe, "playVideo");
      window.setTimeout(play, 400);
      window.setTimeout(play, 1200);
      window.setTimeout(play, 2500);
    };
    iframe.addEventListener("load", onLoad);

    const gestureEvents = [
      "touchstart",
      "touchend",
      "pointerdown",
      "click",
      "scroll",
    ] as const;
    for (const evt of gestureEvents) {
      document.addEventListener(evt, play, { passive: true });
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") play();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", play);
    window.addEventListener("focus", play);
    const keepAlive = window.setInterval(() => {
      if (document.visibilityState === "visible") play();
    }, 3500);

    return () => {
      iframe.removeEventListener("load", onLoad);
      window.clearInterval(keepAlive);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", play);
      window.removeEventListener("focus", play);
      for (const evt of gestureEvents) {
        document.removeEventListener(evt, play);
      }
    };
  }, [useApi, fallbackSrc, start]);

  return (
    <div className={`${className} kitchen-collage-slot--video`}>
      {useApi ? (
        <div ref={hostRef} className="kitchen-collage-video-host" />
      ) : fallbackSrc ? (
        <iframe
          ref={iframeRef}
          className="kitchen-collage-video"
          src={fallbackSrc}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen={false}
          loading="eager"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : null}
      {/* Blocks YouTube chrome; first tap still kicks muted play on iOS */}
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
  if (allowVideo && isYouTubeUrl(url)) {
    return (
      <CollageVideo
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
              allowVideo={index === 0 || isYouTubeUrl(img.url)}
              startSeconds={img.startSeconds}
            />
          ) : null
        )}
      </div>
    </section>
  );
}
