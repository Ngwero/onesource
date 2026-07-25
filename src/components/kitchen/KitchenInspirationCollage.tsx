import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchKitchenCollage } from "../../api/client";
import type { KitchenCollage } from "../../types/kitchenCollage";
import { resolveImageUrl } from "../../utils/imageUrl";
import { isYouTubeUrl, youtubeEmbedUrl } from "../../utils/youtube";

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
    return (
      <div className={`${className} kitchen-collage-slot--video`}>
        <iframe
          className="kitchen-collage-video"
          src={embed}
          title={alt}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="eager"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
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
