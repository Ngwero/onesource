import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ProductImageZoom } from "./ProductImageZoom";
import { PLACEHOLDER_IMAGE } from "../../utils/imageUrl";

type Props = {
  imageSrc: string;
  alt: string;
  discount?: number;
};

export function ProductImageGallery({ imageSrc, alt, discount = 0 }: Props) {
  const { t } = useTranslation();
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const thumbSlots = [0, 1, 2, 3];

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
      <div className="pdp-gallery-tabs" role="tablist" aria-label={t("product.mediaTabs")}>
        <span className="pdp-gallery-tab is-active" role="tab" aria-selected>
          {t("product.tabImages")}
        </span>
      </div>

      <div className="pdp-gallery-inner">
        <div className="hidden sm:flex flex-col gap-2 shrink-0" aria-label={t("product.thumbnailStrip")}>
          {thumbSlots.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveImage(i)}
              className={`pdp-thumb pdp-thumb-vertical ${activeImage === i ? "pdp-thumb-active" : ""}`}
              aria-label={t("product.imageN", { n: i + 1 })}
              aria-current={activeImage === i ? "true" : undefined}
            >
              <img
                src={imageSrc}
                alt=""
                crossOrigin="anonymous"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.src !== PLACEHOLDER_IMAGE) img.src = PLACEHOLDER_IMAGE;
                }}
              />
            </button>
          ))}
        </div>

        <ProductImageZoom
          imageSrc={imageSrc}
          alt={alt}
          discount={discount}
          onOpenLightbox={() => setLightboxOpen(true)}
          enlargeLabel={t("product.clickToEnlarge")}
          rollOverHint={t("product.rollOverToZoom")}
        />
      </div>

      <div className="flex sm:hidden gap-2 overflow-x-auto scrollbar-hide mt-2 pb-1">
        {thumbSlots.map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveImage(i)}
            className={`pdp-thumb ${activeImage === i ? "pdp-thumb-active" : ""}`}
            aria-label={t("product.imageN", { n: i + 1 })}
          >
            <img
              src={imageSrc}
              alt=""
              crossOrigin="anonymous"
              onError={(e) => {
                const img = e.currentTarget;
                if (img.src !== PLACEHOLDER_IMAGE) img.src = PLACEHOLDER_IMAGE;
              }}
            />
          </button>
        ))}
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
            crossOrigin="anonymous"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src !== PLACEHOLDER_IMAGE) img.src = PLACEHOLDER_IMAGE;
            }}
          />
        </div>
      )}
    </div>
  );
}
