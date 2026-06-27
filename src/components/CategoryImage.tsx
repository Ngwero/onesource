import { resolveImageUrl } from "../utils/imageUrl";

type Variant = "tile" | "card";

type Props = {
  src: string | undefined;
  alt?: string;
  variant?: Variant;
};

const wrapperClass: Record<Variant, string> = {
  tile: "category-tile-media",
  card: "category-card-full-media",
};

/** Scales image to fit its box on any screen size (object-contain via max dimensions). */
export function CategoryImage({ src, alt = "", variant = "tile" }: Props) {
  const imageSrc = resolveImageUrl(src);
  if (!imageSrc) return null;

  return (
    <div className={wrapperClass[variant]}>
      <img
        src={imageSrc}
        alt={alt}
        className="category-contain-img"
        loading="lazy"
        decoding="async"
        sizes={
          variant === "tile"
            ? "(max-width: 479px) 45vw, (max-width: 767px) 30vw, (max-width: 1023px) 22vw, 14vw"
            : "(max-width: 479px) 90vw, (max-width: 767px) 45vw, (max-width: 1279px) 30vw, 22vw"
        }
      />
    </div>
  );
}
