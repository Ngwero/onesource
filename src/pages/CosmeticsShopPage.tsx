import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { ProductImage } from "../components/ProductImage";
import { CosmeticsProductCard } from "../components/cosmetics/CosmeticsProductCard";
import { CosmeticsHeroCarousel } from "../components/cosmetics/CosmeticsHeroCarousel";
import { useCosmeticsCatalog } from "../hooks/useCosmeticsCatalog";
import { cosmeticsAislePath } from "../utils/cosmeticsMode";
import { splitCosmeticTitle } from "../data/cosmeticBrands";
import type { Product } from "../types/product";

const ROW_LIMIT = 6;
const TOP_BRANDS = 14;

function sortBestSellers(products: Product[]) {
  return [...products].sort((a, b) => b.rating * b.reviewCount - a.rating * a.reviewCount);
}

export function CosmeticsShopPage() {
  const { t } = useTranslation();
  const { aisles, cosmeticsProducts, loading } = useCosmeticsCatalog();

  const stocked = useMemo(
    () =>
      aisles
        .filter((aisle) => aisle.products.length > 0)
        .map((aisle) => ({
          ...aisle,
          label: t(`cosmetics.aisles.${aisle.id}`, { defaultValue: aisle.title }),
          ranked: sortBestSellers(aisle.products),
        })),
    [aisles, t]
  );

  const topBrands = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of cosmeticsProducts) {
      const { brand } = splitCosmeticTitle(p.title);
      if (brand) counts.set(brand, (counts.get(brand) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_BRANDS)
      .map(([brand]) => brand);
  }, [cosmeticsProducts]);

  const offers = useMemo(
    () =>
      sortBestSellers(
        cosmeticsProducts.filter((p) => p.originalPrice != null && p.originalPrice > p.price)
      ).slice(0, ROW_LIMIT),
    [cosmeticsProducts]
  );

  return (
    <div className="cos-page">
      <PageContainer className="cos-shell">
        <CosmeticsHeroCarousel />

        {loading && cosmeticsProducts.length === 0 ? (
          <p className="cos-empty">{t("common.loading")}</p>
        ) : stocked.length === 0 ? (
          <p className="cos-empty">{t("cosmetics.empty")}</p>
        ) : (
          <>
            <section className="cos-section">
              <h2 className="cos-section-title">{t("cosmetics.shopByCategory")}</h2>
              <div className="cos-circles">
                {stocked.map((aisle, index) => (
                  <Link key={aisle.id} to={cosmeticsAislePath(aisle.id)} className="cos-circle">
                    <span className="cos-circle-media">
                      <ProductImage
                        src={aisle.ranked[0].image}
                        alt=""
                        size="thumb"
                        priority={index < 8}
                      />
                    </span>
                    <span className="cos-circle-label">{aisle.label}</span>
                  </Link>
                ))}
              </div>
            </section>

            {topBrands.length > 0 && (
              <section className="cos-section">
                <h2 className="cos-section-title">{t("cosmetics.topBrands")}</h2>
                <div className="cos-brands">
                  {topBrands.map((brand) => (
                    <Link
                      key={brand}
                      to={`/cosmetics/products?brand=${encodeURIComponent(brand)}`}
                      className="cos-brand-chip"
                    >
                      {brand}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {offers.length > 0 && (
              <ProductRow
                title={t("kitchen.home.feedOffers")}
                href="/cosmetics/products?sale=1"
                products={offers}
              />
            )}

            {stocked.map((aisle) => (
              <ProductRow
                key={aisle.id}
                title={aisle.label}
                href={cosmeticsAislePath(aisle.id)}
                products={aisle.ranked.slice(0, ROW_LIMIT)}
                total={aisle.products.length}
              />
            ))}
          </>
        )}
      </PageContainer>
    </div>
  );
}

function ProductRow({
  title,
  href,
  products,
  total,
}: {
  title: string;
  href: string;
  products: Product[];
  total?: number;
}) {
  const { t } = useTranslation();
  return (
    <section className="cos-section cos-section--grid">
      <h2 className="cos-grid-title">
        {title}
        {total != null && <span>{t("kitchen.categoryCount", { count: total })}</span>}
      </h2>
      <div className="cos-row">
        {products.map((product) => (
          <div key={product.id} className="cos-row-item">
            <CosmeticsProductCard product={product} />
          </div>
        ))}
      </div>
      <div className="cos-view-all-wrap">
        <Link to={href} className="cos-view-all">
          {t("cosmetics.seeAll")}
        </Link>
      </div>
    </section>
  );
}
