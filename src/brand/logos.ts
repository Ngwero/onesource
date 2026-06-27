/** One Source logo assets (from brand guidelines). */
export const BRAND_LOGOS = {
  /** Primary lockup — light backgrounds (header, footer) */
  primary: "/brand/logo-primary.png",
  /** Stacked lockup on dark green */
  onDarkStacked: "/brand/logo-on-dark-stacked.png",
  /** Horizontal lockup on dark green (admin sidebar) */
  onDarkHorizontal: "/brand/logo-on-dark-horizontal.png",
  /** Horizontal lockup on black */
  horizontal: "/brand/logo-horizontal.png",
  /** Symbol / icon only */
  icon: "/brand/logo-icon.png",
} as const;

export type BrandLogoVariant = keyof typeof BRAND_LOGOS;
