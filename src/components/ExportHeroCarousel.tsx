import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchHeroSlides } from "../api/client";
import type { HeroSlide } from "../types/hero";
import { IMAGE_WIDTH, resolveImageUrl } from "../utils/imageUrl";

const AUTOPLAY_MS = 6500;

const FALLBACK_SLIDES: HeroSlide[] = [
  {
    id: "export-fallback-1",
    sortOrder: 0,
    image:
      "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=1920&q=75&auto=format&fit=crop",
    badge: "Global exports",
    title: "Uganda's freshest produce, delivered to the world",
    subtitle:
      "Certified produce, cold-chain protected and air-freighted from Entebbe.",
    cta: "Browse export produce",
    ctaHref: "/category/export-fresh-produce",
  },
  {
    id: "export-fallback-2",
    sortOrder: 1,
    image:
      "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1920&q=75&auto=format&fit=crop",
    badge: "Export-grade quality",
    title: "Packed for international markets",
    subtitle: "Carefully graded, documented and packed to protect freshness.",
    cta: "Place an order",
    ctaHref: "/category/export-fresh-produce",
  },
  {
    id: "export-fallback-3",
    sortOrder: 2,
    image:
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1920&q=75&auto=format&fit=crop",
    badge: "Reliable air freight",
    title: "From Uganda to your market",
    subtitle: "Established export lanes connect our farms with buyers worldwide.",
    cta: "Talk to our export team",
    ctaHref: "#export-contact",
  },
];

type Props = {
  children: ReactNode;
};

export function ExportHeroCarousel({ children }: Props) {
  const { t } = useTranslation();
  const [apiSlides, setApiSlides] = useState<HeroSlide[] | null>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchHeroSlides("exports")
      .then((slides) => {
        if (!cancelled) setApiSlides(slides);
      })
      .catch(() => {
        if (!cancelled) setApiSlides(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const slides = useMemo(() => {
    const source = apiSlides?.length ? apiSlides : FALLBACK_SLIDES;
    return [...source]
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .slice(0, 3);
  }, [apiSlides]);
  const count = slides.length || 1;

  const goTo = useCallback(
    (index: number) => setActive(((index % count) + count) % count),
    [count]
  );
  const next = useCallback(() => goTo(active + 1), [active, goTo]);

  useEffect(() => {
    if (active >= count) setActive(0);
  }, [active, count]);

  useEffect(() => {
    if (paused || count <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(next, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [count, next, paused]);

  useEffect(() => {
    const first = slides[0]?.image;
    if (!first) return;
    const href = resolveImageUrl(first, { width: IMAGE_WIDTH.hero, quality: 72 });
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = href;
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [slides]);

  return (
    <section
      className="relative w-full overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current == null) return;
        const distance = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(distance) < 45) return;
        goTo(active + (distance < 0 ? 1 : -1));
      }}
      role="region"
      aria-roledescription="carousel"
      aria-label={t("exports.hero.kicker")}
    >
      <div className="absolute inset-0 bg-emerald-950" aria-live="polite">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              index === active ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={index !== active}
          >
            <img
              src={resolveImageUrl(slide.image, {
                width: IMAGE_WIDTH.hero,
                quality: 72,
              })}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full scale-110 object-cover object-center opacity-40 blur-xl sm:hidden"
              loading="lazy"
              decoding="async"
            />
            <img
              src={resolveImageUrl(slide.image, {
                width: IMAGE_WIDTH.hero,
                quality: 72,
              })}
              srcSet={`${resolveImageUrl(slide.image, {
                width: IMAGE_WIDTH.hero,
                quality: 72,
              })} ${IMAGE_WIDTH.hero}w, ${resolveImageUrl(slide.image, {
                width: IMAGE_WIDTH.hero2x,
                quality: 72,
              })} ${IMAGE_WIDTH.hero2x}w`}
              sizes="100vw"
              alt=""
              className="relative h-full w-full object-contain object-top sm:object-cover sm:object-center"
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={index === active ? "high" : "auto"}
            />
            <div
              className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-emerald-950/90 via-emerald-900/55 to-transparent sm:w-[62%]"
              aria-hidden
            />
          </div>
        ))}
      </div>

      <div className="page-container relative flex min-h-[540px] flex-col justify-center pb-14 pt-8 sm:min-h-[480px] sm:py-16">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={index === active ? "block" : "hidden"}
            aria-hidden={index !== active}
          >
            {slide.badge && (
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white backdrop-blur sm:text-xs">
                {slide.badge}
              </span>
            )}
            <h1 className="mt-3 max-w-2xl text-2xl font-bold leading-[1.15] text-white sm:mt-4 sm:text-4xl md:text-5xl">
              {slide.title}
            </h1>
            {slide.subtitle && (
              <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-emerald-50/90 sm:mt-3 sm:text-base">
                {slide.subtitle}
              </p>
            )}
            <Link
              to={slide.ctaHref}
              tabIndex={index === active ? 0 : -1}
              className="mt-4 inline-flex min-h-11 items-center rounded-full border border-white/35 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20 sm:mt-5"
            >
              {slide.cta} →
            </Link>
          </div>
        ))}

        <div className="mt-4 sm:mt-6">{children}</div>
      </div>

      {count > 1 && (
        <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-2 sm:bottom-4 sm:gap-2.5">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => goTo(index)}
              className="h-2 w-2 overflow-hidden rounded-full bg-white/35 sm:h-1.5 sm:w-12"
              aria-label={t("home.heroGoTo", { n: index + 1 })}
              aria-current={index === active ? "true" : undefined}
            >
              {index === active && (
                <span
                  key={`${slide.id}-${active}`}
                  className="export-hero-progress block h-full w-full origin-left rounded-full bg-white"
                  style={{
                    animationDuration: `${AUTOPLAY_MS}ms`,
                    animationPlayState: paused ? "paused" : "running",
                  }}
                  aria-hidden
                />
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
