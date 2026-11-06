import { useMemo } from "react";
import { PageContainer } from "../components/PageContainer";
import { HeroSlider } from "../components/HeroSlider";
import { PromoMarquee } from "../components/PromoMarquee";
import { DealOfDayBanner } from "../components/DealOfDayBanner";
import { HomeProductRow } from "../components/HomeProductRow";
import { HomeRecentlyViewedRow } from "../components/HomeRecentlyViewedRow";
import { HomeBuyItAgainRow } from "../components/HomeBuyItAgainRow";
import { ScrollReveal } from "../components/ScrollReveal";
import { useProducts } from "../context/ProductsContext";
import { buildHomeCategoryRows } from "../data/homeRows";
import { useFreshHomeShelfBoost } from "../hooks/useFreshHomeShelf";

export function HomePage() {
  const { products, categories } = useProducts();
  const aisleBoost = useFreshHomeShelfBoost();
  const catalog = useMemo(() => {
    if (!aisleBoost.length) return products;
    const byId = new Map(products.map((p) => [p.id, p]));
    for (const product of aisleBoost) {
      if (!byId.has(product.id)) byId.set(product.id, product);
    }
    return [...byId.values()];
  }, [products, aisleBoost]);
  const rows = useMemo(
    () => buildHomeCategoryRows(catalog, categories),
    [catalog, categories]
  );

  return (
    <div className="home w-full pb-8 sm:pb-16">
      <PageContainer className="pt-4 sm:pt-6">
        <HeroSlider />
      </PageContainer>

      <PageContainer className="mt-4 sm:mt-6 space-y-4">
        <ScrollReveal variant="fade">
          <PromoMarquee />
        </ScrollReveal>
        <DealOfDayBanner />
      </PageContainer>

      <PageContainer className="mt-6 sm:mt-8 space-y-7 sm:space-y-9">
        <HomeBuyItAgainRow />
        <HomeRecentlyViewedRow />
        {rows.map(({ row, products: rowProducts }) => (
          <HomeProductRow key={row.id} row={row} products={rowProducts} />
        ))}

      </PageContainer>
    </div>
  );
}
