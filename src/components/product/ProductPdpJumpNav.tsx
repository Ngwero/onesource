import { useTranslation } from "react-i18next";

const LINKS = [
  { id: "pdp-about", key: "product.jumpAbout" },
  { id: "pdp-reviews", key: "product.jumpReviews" },
  { id: "pdp-description", key: "product.jumpDescription" },
  { id: "pdp-all-specifications", key: "product.jumpSpecs" },
] as const;

export function ProductPdpJumpNav() {
  const { t } = useTranslation();

  return (
    <nav className="pdp-jump-nav" aria-label={t("product.jumpNavLabel")}>
      {LINKS.map((link) => (
        <a key={link.id} href={`#${link.id}`} className="pdp-jump-link">
          {t(link.key)}
        </a>
      ))}
    </nav>
  );
}
