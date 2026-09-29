import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchHeroSlides } from "../../api/client";
import { resolveImageUrl } from "../../utils/imageUrl";
import { cosmeticsAislePath } from "../../utils/cosmeticsMode";

const AUTOPLAY_MS = 6000;

type Tone = "light" | "dark";

type CarouselSlide = {
  id: string;
  image: string;
  badge: string;
  title: string;
  subtitle: string;
  cta: string;
  ctaHref: string;
  cta2?: string;
  cta2Href?: string;
  tone: Tone;
};

function useDefaultSlides(): CarouselSlide[] {
  const { t } = useTranslation();
  return useMemo(
    () => [
      {
        id: "gifts",
        image: "/cosmetics/hero/gifts.webp",
        badge: t("cosmetics.hero.giftsBadge"),
        title: t("cosmetics.hero.giftsTitle"),
        subtitle: t("cosmetics.hero.giftsSub"),
        cta: t("cosmetics.hero.giftsCta"),
        ctaHref: cosmeticsAislePath("kits-bundles"),
        cta2: t("cosmetics.hero.offersCta"),
        cta2Href: "/cosmetics/products?sale=1",
        tone: "light",
      },
      {
        id: "makeup",
        image: "/cosmetics/hero/makeup.webp",
        badge: t("cosmetics.hero.makeupBadge"),
        title: t("cosmetics.hero.makeupTitle"),
        subtitle: t("cosmetics.hero.makeupSub"),
        cta: t("cosmetics.hero.makeupCta"),
        ctaHref: cosmeticsAislePath("face-makeup"),
        cta2: t("cosmetics.hero.makeupCta2"),
        cta2Href: cosmeticsAislePath("eye-makeup"),
        tone: "light",
      },
      {
        id: "skincare",
        image: "/cosmetics/hero/skincare.webp",
        badge: t("cosmetics.hero.skincareBadge"),
        title: t("cosmetics.hero.skincareTitle"),
        subtitle: t("cosmetics.hero.skincareSub"),
        cta: t("cosmetics.hero.skincareCta"),
        ctaHref: cosmeticsAislePath("serums-oils"),
        cta2: t("cosmetics.hero.skincareCta2"),
        cta2Href: cosmeticsAislePath("sun-protection"),
        tone: "light",
      },
      {
        id: "fragrance",
        image: "/cosmetics/hero/fragrance.webp",
        badge: t("cosmetics.hero.fragranceBadge"),
        title: t("cosmetics.hero.fragranceTitle"),
        subtitle: t("cosmetics.hero.fragranceSub"),
        cta: t("cosmetics.hero.fragranceCta"),
        ctaHref: cosmeticsAislePath("hair-baby-more"),
        tone: "dark",
      },
    ],
    [t]
  );
}

function useAdminSlides(): CarouselSlide[] {
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchHeroSlides("cosmetics")
      .then((rows) => {
        if (cancelled) return;
        // Older servers answer unknown placements with homepage slides.
        const own = rows
          .filter((s) => s.id.startsWith("cosmetics-") && s.active !== false && s.image)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map<CarouselSlide>((s) => ({
            id: s.id,
            image: resolveImageUrl(s.image),
            badge: s.badge,
            title: s.title,
            subtitle: s.subtitle,
            cta: s.cta,
            ctaHref: s.ctaHref,
            cta2: s.cta2,
            cta2Href: s.cta2Href,
            tone: "dark",
          }));
        setSlides(own);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return slides;
}

export function CosmeticsHeroCarousel() {
  const { t } = useTranslation();
  const defaults = useDefaultSlides();
  const adminSlides = useAdminSlides();
  const slides = adminSlides.length > 0 ? adminSlides : defaults;

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const count = slides.length;
  const current = count > 0 ? index % count : 0;

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (paused || hovered || count < 2) return;
    const timer = window.setTimeout(() => go(current + 1), AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [current, paused, hovered, count, go]);

  if (count === 0) return null;

  return (
    <section
      className="cos-carousel"
      aria-roledescription="carousel"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
    >
      <div className="cos-carousel-track" style={{ transform: `translateX(-${current * 100}%)` }}>
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className={`cos-slide cos-slide--${slide.tone}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${count}`}
            aria-hidden={i !== current}
          >
            <img
              className="cos-slide-img"
              src={slide.image}
              alt=""
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "auto"}
              decoding="async"
            />
            <div className="cos-slide-copy">
              {slide.badge && <p className="cos-slide-badge">{slide.badge}</p>}
              <h2 className="cos-slide-title">{slide.title}</h2>
              {slide.subtitle && <p className="cos-slide-sub">{slide.subtitle}</p>}
              <div className="cos-slide-actions">
                {slide.cta && slide.ctaHref && (
                  <Link to={slide.ctaHref} className="cos-slide-btn" tabIndex={i === current ? 0 : -1}>
                    {slide.cta}
                  </Link>
                )}
                {slide.cta2 && slide.cta2Href && (
                  <Link
                    to={slide.cta2Href}
                    className="cos-slide-btn cos-slide-btn--ghost"
                    tabIndex={i === current ? 0 : -1}
                  >
                    {slide.cta2}
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            className="cos-carousel-arrow cos-carousel-arrow--prev"
            onClick={() => go(current - 1)}
            aria-label={t("cosmetics.hero.prev")}
          >
            ‹
          </button>
          <button
            type="button"
            className="cos-carousel-arrow cos-carousel-arrow--next"
            onClick={() => go(current + 1)}
            aria-label={t("cosmetics.hero.next")}
          >
            ›
          </button>
          <div className="cos-carousel-controls">
            <div className="cos-carousel-dots">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  className={`cos-carousel-dot${i === current ? " is-active" : ""}`}
                  onClick={() => go(i)}
                  aria-label={t("cosmetics.hero.goTo", { n: i + 1 })}
                  aria-current={i === current}
                />
              ))}
            </div>
            <button
              type="button"
              className="cos-carousel-pause"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? t("cosmetics.hero.play") : t("cosmetics.hero.pause")}
            >
              {paused ? "▶" : "❚❚"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
