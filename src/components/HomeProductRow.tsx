import { useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Product } from "../types/product";
import type { HomeRowConfig } from "../data/homeRows";
import { ProductCard } from "../components/ProductCard";
import { ScrollReveal } from "./ScrollReveal";
import { Section } from "./Section";
import { useAutoScrollByItems } from "../hooks/useAutoScrollByItems";

type Props = {
  row: HomeRowConfig;
  products: Product[];
};

export function HomeProductRow({ row, products }: Props) {
  const { t } = useTranslation();
  const hoverRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useAutoScrollByItems(trackRef, products.length, {
    pauseRootRef: hoverRef,
    itemSelector: ".home-product-row-item",
    itemsPerStep: 2,
    intervalMs: 4500,
    minItems: 3,
  });

  if (products.length === 0) return null;

  const seeAllTo = row.seeAllHref
    ? row.seeAllHref
    : row.seeAllCategoryId
      ? `/category/${row.seeAllCategoryId}`
      : `/search?q=${encodeURIComponent(row.seeAllSearch ?? "")}`;

  return (
    <ScrollReveal variant="fade-up">
      <div ref={hoverRef} className="home-product-row-hover-zone">
        <Section
        title={t(row.titleKey)}
        subtitle={t(row.subtitleKey)}
        action={
          <Link
            to={seeAllTo}
            className="text-sm font-semibold text-accent hover:underline whitespace-nowrap"
          >
            {t("home.rows.seeAll")} →
          </Link>
        }
        className="home-product-row-section"
      >
        <div ref={trackRef} className="home-product-row" role="list">
          {products.map((product) => (
            <div key={product.id} className="home-product-row-item" role="listitem">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </Section>
      </div>
    </ScrollReveal>
  );
}
