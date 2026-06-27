import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../context/CurrencyContext";
import { FREE_DELIVERY_THRESHOLD_GBP } from "../currency/currencies";
import { fetchHeroSlides } from "../api/client";
import type { HeroSlide } from "../types/hero";
import {
  mergeHeroSlideWithI18n,
  type HeroSlideContent,
} from "../i18n/mergeHeroSlide";

const AUTOPLAY_MS = 6000;

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=1400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1598170845058-32b9d55a39dd?w=1400&h=600&fit=crop",
];

function i18nSlidesToContent(slides: HeroSlideContent[]): HeroSlideContent[] {
  return slides.map((s, i) => ({
    ...s,
    id: s.id ?? `hero-${i + 1}`,
    image: s.image ?? FALLBACK_IMAGES[i % FALLBACK_IMAGES.length],
  }));
}

function apiSlidesToContent(slides: HeroSlide[]): HeroSlideContent[] {
  return [...slides]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((s) => ({
      id: s.id,
      image: s.image,
      badge: s.badge,
      title: s.title,
      subtitle: s.subtitle,
      cta: s.cta,
      ctaHref: s.ctaHref,
      cta2: s.cta2,
      cta2Href: s.cta2Href,
    }));
}

export function HeroSlider() {
  const { t, i18n } = useTranslation();
  const { formatPrice } = useCurrency();

  const i18nOnlySlides = useMemo(() => {
    const raw = t("home.slides", { returnObjects: true }) as HeroSlideContent[];
    return Array.isArray(raw) ? i18nSlidesToContent(raw) : [];
  }, [t, i18n.language]);

  const [apiSlides, setApiSlides] = useState<HeroSlideContent[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchHeroSlides()
      .then((slides) => {
        if (cancelled) return;
        if (slides.length > 0) {
          setApiSlides(apiSlidesToContent(slides));
        }
      })
      .catch(() => {
        if (!cancelled) setApiSlides(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const slideList = useMemo(() => {
    const base =
      apiSlides && apiSlides.length > 0 ? apiSlides : i18nOnlySlides;
    return base.map((slide, index) => mergeHeroSlideWithI18n(slide, index, t));
  }, [apiSlides, i18nOnlySlides, t, i18n.language]);

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slideList.length || 1;

  const goTo = useCallback(
    (index: number) => {
      setActive(((index % count) + count) % count);
    },
    [count]
  );

  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1), [active, goTo]);

  useEffect(() => {
    if (active >= count) setActive(0);
  }, [active, count]);

  useEffect(() => {
    if (paused || count <= 1) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    const id = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, next, count]);

  if (slideList.length === 0) return null;

  const interpolate = (text: string) =>
    text
      .replace(/\{\{price\}\}/g, formatPrice(3_500))
      .replace(/\{\{amount\}\}/g, formatPrice(FREE_DELIVERY_THRESHOLD_GBP));

  return (
    <div
      className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl bg-muted aspect-[4/3] sm:aspect-[16/9] lg:aspect-[7/3] min-h-[220px] sm:min-h-[280px] lg:min-h-[340px] max-h-[480px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label={t("home.heroCarousel")}
    >
      <div className="absolute inset-0">
        {slideList.map((slide, index) => (
          <div
            key={slide.id ?? index}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              index === active ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
            aria-hidden={index !== active}
          >
            <img
              src={
                slide.image ??
                FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]
              }
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div
              className="absolute inset-y-0 left-0 z-[5] w-full sm:w-[78%] lg:w-[62%] bg-gradient-to-r from-text/92 via-text/65 to-transparent pointer-events-none"
              aria-hidden
            />

            <div className="relative z-10 flex flex-col justify-center h-full p-6 sm:p-10 lg:p-12">
              <div className="max-w-2xl">
                {slide.badge ? (
                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 backdrop-blur-md border border-white/20 px-3 sm:px-4 py-1.5 text-xs font-medium text-white mb-3 sm:mb-4">
                    <span className="w-2 h-2 rounded-full bg-lemon animate-pulse flex-shrink-0" />
                    {slide.badge}
                  </span>
                ) : null}
                <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white tracking-tight leading-tight">
                  {slide.title}
                </h2>
                {slide.subtitle ? (
                  <p className="text-white/90 text-sm sm:text-base lg:text-lg mt-3 sm:mt-4 leading-relaxed">
                    {interpolate(slide.subtitle)}
                  </p>
                ) : null}
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-5 sm:mt-7">
                  <Link
                    to={slide.ctaHref}
                    className="btn-primary w-full sm:w-auto justify-center"
                    tabIndex={index === active ? 0 : -1}
                  >
                    {slide.cta}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                  {slide.cta2 && slide.cta2Href && (
                    <Link
                      to={slide.cta2Href}
                      className="btn-secondary w-full sm:w-auto justify-center !bg-white/10 !border-white/30 !text-white hover:!bg-white/20"
                      tabIndex={index === active ? 0 : -1}
                    >
                      {slide.cta2}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/20 hover:bg-white/35 backdrop-blur-md border border-white/30 text-white flex items-center justify-center transition-all"
            aria-label={t("home.heroPrev")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/20 hover:bg-white/35 backdrop-blur-md border border-white/30 text-white flex items-center justify-center transition-all"
            aria-label={t("home.heroNext")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {count > 1 && (
        <div className="absolute bottom-4 sm:bottom-6 left-0 right-0 z-20 flex justify-center gap-2">
          {slideList.map((slide, index) => (
            <button
              key={slide.id ?? index}
              type="button"
              onClick={() => goTo(index)}
              className={`h-2 rounded-full transition-all ${
                index === active
                  ? "w-8 bg-white"
                  : "w-2 bg-white/50 hover:bg-white/80"
              }`}
              aria-label={t("home.heroGoTo", { n: index + 1 })}
              aria-current={index === active ? "true" : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
