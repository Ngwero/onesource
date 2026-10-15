import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ProductImageZoom } from "./ProductImageZoom";
import { ProductLightbox } from "./ProductLightbox";

type Props = {
  imageSrc: string;
  /** Extra angles. Falls back to the single hero image. */
  images?: string[];
  alt: string;
  discount?: number;
};

export function ProductImageGallery({ imageSrc, images, alt, discount = 0 }: Props) {
  const { t } = useTranslation();
  const gallery = useMemo(() => {
    const list = (images?.length ? images : [imageSrc]).map((src) => src.trim()).filter(Boolean);
    return list.length ? list : [imageSrc];
  }, [imageSrc, images]);
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const safeIndex = Math.min(index, gallery.length - 1);
  const current = gallery[safeIndex] ?? imageSrc;

  useEffect(() => {
    setIndex(0);
  }, [imageSrc]);

  const step = (dir: 1 | -1) => {
    setIndex((i) => (i + dir + gallery.length) % gallery.length);
  };

  return (
    <div className="pdp-gallery">
      <div className="pdp-gallery-inner">
        <ProductImageZoom
          imageSrc={current}
          alt={alt}
          discount={discount}
          onOpenLightbox={() => setLightboxOpen(true)}
          onSwipeImage={gallery.length > 1 ? step : undefined}
          enlargeLabel={t("product.clickToEnlarge")}
          rollOverHint={t("product.rollOverToZoom")}
          tapHint={t("product.tapToEnlarge")}
        />
      </div>

      {gallery.length > 1 && (
        <div className="pdp-thumbs" role="tablist" aria-label={t("product.thumbnailStrip")}>
          {gallery.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              className={`pdp-thumb ${i === safeIndex ? "is-active" : ""}`}
              aria-label={t("product.imageN", { n: i + 1 })}
              aria-current={i === safeIndex ? "true" : undefined}
              onClick={() => setIndex(i)}
            >
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && (
        <ProductLightbox
          images={gallery}
          index={safeIndex}
          alt={alt}
          onIndex={setIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
