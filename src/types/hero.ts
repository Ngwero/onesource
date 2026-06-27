export type HeroSlide = {
  id: string;
  sortOrder: number;
  image: string;
  badge: string;
  title: string;
  subtitle: string;
  cta: string;
  ctaHref: string;
  cta2?: string;
  cta2Href?: string;
  active?: boolean;
};
