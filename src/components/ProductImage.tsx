import { useState } from "react";
import { IMAGE_WIDTH, imageSrcSet, resolveImageUrl } from "../utils/imageUrl";

type Props = {
  src: string;
  alt: string;
  className?: string;
  /** compact = smaller padding for cart thumbnails */
  size?: "card" | "detail" | "thumb" | "basket";
  /** Load immediately (above-the-fold cards / first aisle items). */
  priority?: boolean;
};

const sizeClasses = {
  card: "aspect-[3/4] w-full p-4 sm:p-6",
  detail: "aspect-[3/4] sm:aspect-[4/5] w-full p-8 sm:p-12 min-h-[320px] sm:min-h-[480px]",
  thumb: "w-[88px] h-[110px] sm:w-[100px] sm:h-[125px] p-2 sm:p-3",
  /** Narrow basket slide panel — scales with container */
  basket: "aspect-square w-full max-w-full min-h-0 p-1 sm:p-1.5",
};

const sizeWidths: Record<
  NonNullable<Props["size"]>,
  { w: number; w2x?: number; height: number; sizes: string; quality: number }
> = {
  card: {
    w: IMAGE_WIDTH.card,
    w2x: IMAGE_WIDTH.card2x,
    height: 400,
    sizes: "(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 200px",
    quality: 70,
  },
  detail: {
    w: IMAGE_WIDTH.detail,
    height: 1250,
    sizes: "(max-width: 640px) 90vw, 480px",
    quality: 78,
  },
  thumb: {
    w: IMAGE_WIDTH.thumb,
    height: 300,
    sizes: "100px",
    quality: 70,
  },
  basket: {
    w: IMAGE_WIDTH.basket,
    height: 160,
    sizes: "72px",
    quality: 70,
  },
};

const FALLBACK_SRC =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640" viewBox="0 0 480 640">
      <rect width="480" height="640" fill="#faf9f6"/>
      <rect x="24" y="24" width="432" height="592" rx="16" fill="#fff" stroke="#e3e1da" stroke-width="2"/>
      <text x="240" y="300" text-anchor="middle" font-family="system-ui,sans-serif" font-size="16" font-weight="600" fill="#2e5e4a">ONE SOURCE</text>
      <text x="240" y="340" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="#5c5c58">Image unavailable</text>
    </svg>`
  );

export function ProductImage({
  src,
  alt,
  className = "",
  size = "card",
  priority = false,
}: Props) {
  const dims = sizeWidths[size];
  const direct = resolveImageUrl(src);
  const resolved = resolveImageUrl(src, { width: dims.w, quality: dims.quality });
  const srcSet = imageSrcSet(
    src,
    dims.w2x
      ? [
          { width: dims.w, quality: dims.quality },
          { width: dims.w2x, quality: dims.quality },
        ]
      : [{ width: dims.w, quality: dims.quality }]
  );
  const [failed, setFailed] = useState(false);
  const [useDirect, setUseDirect] = useState(false);
  const sizedSrc = useDirect ? direct : resolved;
  const imageSrc = !sizedSrc || failed ? FALLBACK_SRC : sizedSrc;

  return (
    <div
      className={`relative overflow-hidden bg-white flex items-center justify-center ${sizeClasses[size]} ${className}`}
    >
      <img
        src={imageSrc}
        srcSet={!failed && !useDirect ? srcSet : undefined}
        sizes={!failed && !useDirect && srcSet ? dims.sizes : undefined}
        width={dims.w}
        height={dims.height}
        alt={alt}
        className="max-w-full max-h-full w-auto h-auto object-contain object-center"
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "low"}
        onError={() => {
          if (!useDirect && direct && direct !== resolved) {
            setUseDirect(true);
            return;
          }
          if (!failed) setFailed(true);
        }}
      />
    </div>
  );
}
