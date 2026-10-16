import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { pharmacyAislePath } from "../../utils/pharmacyMode";

const slides = [
  { id: "everyday", title: "title", accent: "titleAccent", description: "description", href: "/pharmacy/products", cta: "pharmacy.ctaBrowse", image: null },
  { id: "vitamins", title: "vitaminsTitle", accent: "vitaminsAccent", description: "vitaminsDescription", href: pharmacyAislePath("supplements"), cta: "pharmacy.aisles.supplements", image: "vitamins" },
  { id: "first-aid", title: "firstAidTitle", accent: "firstAidAccent", description: "firstAidDescription", href: pharmacyAislePath("first-aid"), cta: "pharmacy.aisles.first-aid", image: "first-aid" },
] as const;

function subscribeMotionPreference(onChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function PharmacyHero() {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const swiped = useRef(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeMotionPreference,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true
  );
  const rotating = !paused && !hovered && !reducedMotion;

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive((index) => (index + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [rotating]);

  const go = (index: number) => {
    setPaused(true);
    setActive((index + slides.length) % slides.length);
  };

  return (
    <section
      className="pharmacy-hero"
      aria-label={t("pharmacy.brand")}
      aria-roledescription="carousel"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={(event) => {
        if (!(event.target as HTMLElement).closest("[data-rotation-control]")) setPaused(true);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          go(active + (event.key === "ArrowRight" ? 1 : -1));
        }
      }}
    >
      <h1 className="sr-only">{t("pharmacy.brand")}</h1>
      <div
        className="pharmacy-hero-viewport"
        onClickCapture={(event) => {
          if (swiped.current) {
            event.preventDefault();
            event.stopPropagation();
            swiped.current = false;
          }
        }}
        onPointerDown={(event) => {
          swiped.current = false;
          if (event.pointerType === "touch") pointerStart.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerCancel={() => { pointerStart.current = null; }}
        onPointerUp={(event) => {
          const start = pointerStart.current;
          pointerStart.current = null;
          if (!start) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) {
            swiped.current = true;
            go(active + (dx < 0 ? 1 : -1));
          }
        }}
      >
        <div className="pharmacy-hero-track" style={{ transform: `translateX(-${active * 100}%)` }} aria-live={rotating ? "off" : "polite"}>
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`pharmacy-hero-main pharmacy-hero-slide pharmacy-hero-slide--${slide.id}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} / ${slides.length}`}
              aria-hidden={index !== active}
              inert={index !== active}
            >
              <div className="pharmacy-hero-copy">
                <p className="pharmacy-hero-eyebrow"><span aria-hidden="true">+</span>{t("pharmacy.brand")}</p>
                <h2 className="pharmacy-hero-title">
                  {t(`pharmacy.hero.${slide.title}`)}<br />
                  <span>{t(`pharmacy.hero.${slide.accent}`)}</span>
                </h2>
                <p className="pharmacy-hero-description">{t(`pharmacy.hero.${slide.description}`)}</p>
                <div className="pharmacy-hero-actions">
                  <Link className="pharmacy-hero-shop" to={slide.href}>
                    {t(slide.cta)}<span aria-hidden="true">↗</span>
                  </Link>
                  <Link className="pharmacy-hero-offers" to="/pharmacy/products?sale=1">
                    {t("pharmacy.hero.offers")}<span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
              <div className="pharmacy-hero-visual" aria-hidden="true">
                <div className="pharmacy-hero-orbit" />
                <span className="pharmacy-hero-plus">+</span>
                <div className="pharmacy-hero-caption">
                  <span>{t("pharmacy.hero.collectionLabel")}</span>
                  <strong>{t("pharmacy.hero.collectionTitle")}</strong>
                </div>
                <div className="pharmacy-hero-pedestal" />
                {slide.image ? (
                  <img className="pharmacy-hero-product pharmacy-hero-product--featured" src={`/pharmacy/hero/${slide.image}.webp`} alt="" width="800" height="800" decoding="async" />
                ) : (
                  <>
                    <img className="pharmacy-hero-product pharmacy-hero-product--vitamins" src="/pharmacy/hero/vitamins.webp" alt="" width="800" height="800" decoding="async" />
                    <img className="pharmacy-hero-product pharmacy-hero-product--care" src="/pharmacy/hero/daily-care.webp" alt="" width="800" height="800" fetchPriority="high" decoding="async" />
                    <img className="pharmacy-hero-product pharmacy-hero-product--aid" src="/pharmacy/hero/first-aid.webp" alt="" width="800" height="800" decoding="async" />
                  </>
                )}
                <span className="pharmacy-hero-note">{t(slide.image ? slide.cta : "pharmacy.hero.visualNote")}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {!reducedMotion && (
        <button
          type="button"
          className="pharmacy-hero-rotation"
          data-rotation-control
          onClick={() => setPaused((value) => !value)}
          aria-label={t(paused ? "cosmetics.hero.play" : "cosmetics.hero.pause")}
        >
          <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span>
        </button>
      )}

    </section>
  );
}
