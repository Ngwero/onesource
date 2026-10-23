import { useMemo } from "react";
import { PageContainer } from "../components/PageContainer";
import { HeroSlider } from "../components/HeroSlider";
import { PromoMarquee } from "../components/PromoMarquee";
import { HomeProductRow } from "../components/HomeProductRow";
import { ScrollReveal } from "../components/ScrollReveal";
import { useProducts } from "../context/ProductsContext";
import { buildHomeCategoryRows } from "../data/homeRows";

export function HomePage() {
  const { products, categories } = useProducts();
  const rows = useMemo(
    () => buildHomeCategoryRows(products, categories),
    [products, categories]
  );

  return (
    <div className="w-full pb-8 sm:pb-16">
      <PageContainer className="pt-4 sm:pt-6">
        <HeroSlider />
      </PageContainer>

      <PageContainer className="mt-4 sm:mt-6">
        <ScrollReveal variant="fade">
          <PromoMarquee />
        </ScrollReveal>
      </PageContainer>

      <PageContainer className="mt-6 sm:mt-8 space-y-7 sm:space-y-9">
        {rows.map(({ row, products: rowProducts }) => (
          <HomeProductRow key={row.id} row={row} products={rowProducts} />
        ))}

      </PageContainer>
    </div>
  );
}
