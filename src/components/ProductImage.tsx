import { resolveImageUrl } from "../utils/imageUrl";

type Props = {
  src: string;
  alt: string;
  className?: string;
  /** compact = smaller padding for cart thumbnails */
  size?: "card" | "detail" | "thumb" | "basket";
};

const sizeClasses = {
  card: "aspect-[3/4] w-full p-4 sm:p-6",
  detail: "aspect-[3/4] sm:aspect-[4/5] w-full p-8 sm:p-12 min-h-[320px] sm:min-h-[480px]",
  thumb: "w-[88px] h-[110px] sm:w-[100px] sm:h-[125px] p-2 sm:p-3",
  /** Narrow basket slide panel — scales with container */
  basket: "aspect-square w-full max-w-full min-h-0 p-1 sm:p-1.5",
};

export function ProductImage({ src, alt, className = "", size = "card" }: Props) {
  const imageSrc = resolveImageUrl(src);
  return (
    <div
      className={`relative overflow-hidden bg-white flex items-center justify-center ${sizeClasses[size]} ${className}`}
    >
      <img
        src={imageSrc}
        alt={alt}
        className="max-w-full max-h-full w-auto h-auto object-contain object-center drop-shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
