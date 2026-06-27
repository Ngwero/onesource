import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Product } from "../types/product";
import { ProductCard } from "./ProductCard";
import { ScrollReveal } from "./ScrollReveal";
import { Section } from "./Section";
import { hasAdminProductImage } from "../utils/productImage";

type Props = {
  products: Product[];
};

const PRODUCTS_PER_ROW = 7;

export function HomeAdminProductsSection({ products }: Props) {
  const { t } = useTranslation();

  const withImages = useMemo(
    () =>
      products
        .filter((p) => hasAdminProductImage(p.image))
        .sort((a, b) => a.title.localeCompare(b.title)),
    [products]
  );

  const rows = useMemo(() => {
    const chunks: Product[][] = [];
    for (let i = 0; i < withImages.length; i += PRODUCTS_PER_ROW) {
      chunks.push(withImages.slice(i, i + PRODUCTS_PER_ROW));
    }
    return chunks;
  }, [withImages]);

  if (withImages.length === 0) return null;

  return (
    <ScrollReveal variant="fade-up">
      <Section
        title={t("home.adminPhotos.title")}
        subtitle={t("home.adminPhotos.subtitle")}
        action={
          <Link
            to="/products"
            className="text-sm font-semibold text-accent hover:underline whitespace-nowrap"
          >
            {t("home.rows.seeAll")} →
          </Link>
        }
        className="home-admin-products-section"
      >
        <div className="home-admin-photos-rows">
          {rows.map((rowProducts, rowIndex) => (
            <ScrollReveal
              key={rowIndex}
              stagger
              className="home-admin-photos-grid"
              variant="fade-up"
              delay={rowIndex * 80}
            >
              {rowProducts.map((product) => (
                <div key={product.id} className="home-admin-photos-grid-item" role="listitem">
                  <ProductCard product={product} />
                </div>
              ))}
            </ScrollReveal>
          ))}
        </div>
      </Section>
    </ScrollReveal>
  );
}
