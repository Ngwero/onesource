import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchKitchenCollage } from "../../api/client";
import type { KitchenCollage } from "../../types/kitchenCollage";
import { resolveImageUrl } from "../../utils/imageUrl";
import {
  isYouTubeUrl,
  youtubeEmbedUrl,
  youtubePostCommand,
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
  src,
  title,
  className,
}: {
  src: string;
  title: string;
  className: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const kick = () => {
      youtubePostCommand(iframe, "mute");
      youtubePostCommand(iframe, "playVideo");
    };

    // YouTube needs a beat after load before API commands work.
    const onLoad = () => {
      kick();
      window.setTimeout(kick, 400);
      window.setTimeout(kick, 1200);
    };
    iframe.addEventListener("load", onLoad);

    // Keep it looping/playing if mobile pauses in the background.
    const keepAlive = window.setInterval(kick, 8000);

    const onVisible = () => {
      if (document.visibilityState === "visible") kick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      iframe.removeEventListener("load", onLoad);
      window.clearInterval(keepAlive);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [src]);

  return (
    <div className={`${className} kitchen-collage-slot--video`}>
      <iframe
        ref={iframeRef}
        className="kitchen-collage-video"
        src={src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen={false}
        loading="eager"
        referrerPolicy="strict-origin-when-cross-origin"
      />
      {/* Blocks taps so YouTube play / skip controls never activate */}
      <div className="kitchen-collage-video-shield" aria-hidden="true" />
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
}: {
  url: string;
  alt: string;
  href?: string;
  className: string;
  priority?: boolean;
  allowVideo?: boolean;
}) {
  const embed = allowVideo ? youtubeEmbedUrl(url) : null;

  if (embed) {
    return <CollageVideo src={embed} title={alt} className={className} />;
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
              key={`${img.url}-${index}`}
              url={img.url}
              alt={img.alt || collage.introTitle || t("kitchen.brand")}
              href={img.href || undefined}
              className={SLOT_CLASS[index] ?? "kitchen-collage-slot"}
              priority={index < 4}
              allowVideo={index === 0 || isYouTubeUrl(img.url)}
            />
          ) : null
        )}
      </div>
    </section>
  );
}
