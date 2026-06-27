import { useTranslation } from "react-i18next";
import { BRAND_LOGOS, type BrandLogoVariant } from "../brand/logos";

type Props = {
  /** Logo file to use */
  variant?: BrandLogoVariant;
  /** Compact: icon on small screens, full lockup from `md` up */
  responsive?: boolean;
  className?: string;
  alt?: string;
};

const HEIGHT: Record<BrandLogoVariant, string> = {
  primary: "h-9 sm:h-11 md:h-12",
  onDarkStacked: "h-10 sm:h-12",
  onDarkHorizontal: "h-8 sm:h-9",
  horizontal: "h-8 sm:h-10",
  icon: "h-9 w-9 sm:h-10 sm:w-10",
};

export function BrandLogo({
  variant = "primary",
  responsive = false,
  className = "",
  alt,
}: Props) {
  const { t } = useTranslation();
  const logoAlt = alt ?? t("common.brand");
  if (responsive && variant === "primary") {
    return (
      <img
        src={BRAND_LOGOS.primary}
        alt={logoAlt}
        className={`h-8 sm:h-9 md:h-11 lg:h-12 w-auto max-w-[min(200px,52vw)] sm:max-w-[220px] object-contain object-left flex-shrink-0 ${className}`}
        width={220}
        height={48}
      />
    );
  }

  const src = BRAND_LOGOS[variant];
  const sizeClass = HEIGHT[variant];

  return (
    <img
      src={src}
      alt={logoAlt}
      className={`${sizeClass} w-auto object-contain object-left flex-shrink-0 ${className}`}
      width={variant === "icon" ? 40 : 200}
      height={variant === "icon" ? 40 : 48}
    />
  );
}
