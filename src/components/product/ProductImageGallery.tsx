import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ProductImageZoom } from "./ProductImageZoom";

type Props = {
  imageSrc: string;
  alt: string;
  discount?: number;
};

export function ProductImageGallery({ imageSrc, alt, discount = 0 }: Props) {
  const { t } = useTranslation();
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [lightboxOpen]);

  return (
    <div className="pdp-gallery">
      <div className="pdp-gallery-inner">
        <ProductImageZoom
          imageSrc={imageSrc}
          alt={alt}
          discount={discount}
          onOpenLightbox={() => setLightboxOpen(true)}
          enlargeLabel={t("product.clickToEnlarge")}
          rollOverHint={t("product.rollOverToZoom")}
        />
      </div>

      {lightboxOpen && (
        <div
          className="pdp-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="pdp-lightbox-close"
            onClick={() => setLightboxOpen(false)}
            aria-label={t("common.close")}
          >
            ×
          </button>
          <img
            src={imageSrc}
            alt={alt}
            className="pdp-lightbox-image"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
