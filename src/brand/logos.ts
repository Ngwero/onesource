/** One Source logo assets (from brand guidelines). */
export const BRAND_LOGOS = {
  /** Primary lockup — transparent horizontal (header, footer, light UI) */
  primary: "/brand/logo-primary.png",
  /** Stacked lockup on dark green */
  onDarkStacked: "/brand/logo-on-dark-stacked.png",
  /** Horizontal lockup on dark green (admin / dark panels) */
  onDarkHorizontal: "/brand/logo-on-dark-horizontal.png",
  /** Horizontal lockup with transparent background */
  horizontal: "/brand/logo-horizontal.png",
  /** Symbol / icon only */
  icon: "/brand/logo-icon.png",
} as const;

export type BrandLogoVariant = keyof typeof BRAND_LOGOS;
