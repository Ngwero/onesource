import type { TFunction } from "i18next";

export type HeroSlideContent = {
  id?: string;
  image?: string;
  badge: string;
  title: string;
  subtitle: string;
  cta: string;
  ctaHref: string;
  cta2?: string;
  cta2Href?: string;
};

function pickI18nSlide(
  t: TFunction,
  slideId: string | undefined,
  index: number
): Partial<HeroSlideContent> | null {
  if (slideId) {
    const byId = t(`home.slidesById.${slideId}`, { returnObjects: true });
    if (
      byId &&
      typeof byId === "object" &&
      !Array.isArray(byId) &&
      "title" in byId
    ) {
      return byId as Partial<HeroSlideContent>;
    }
  }

  const slides = t("home.slides", { returnObjects: true });
  if (Array.isArray(slides) && slides[index] && typeof slides[index] === "object") {
    return slides[index] as Partial<HeroSlideContent>;
  }

  return null;
}

/** Keep image/links from API; badge, title, subtitle, CTAs from active locale. */
export function mergeHeroSlideWithI18n(
  slide: HeroSlideContent,
  index: number,
  t: TFunction
): HeroSlideContent {
  const i18n = pickI18nSlide(t, slide.id, index);
  if (!i18n) return slide;

  return {
    ...slide,
    badge: i18n.badge ?? slide.badge,
    title: i18n.title ?? slide.title,
    subtitle: i18n.subtitle ?? slide.subtitle,
    cta: i18n.cta ?? slide.cta,
    ctaHref: i18n.ctaHref ?? slide.ctaHref,
    cta2: i18n.cta2 ?? slide.cta2,
    cta2Href: i18n.cta2Href ?? slide.cta2Href,
  };
}
