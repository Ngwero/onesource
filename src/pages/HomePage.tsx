import { useMemo } from "react";
import { PageContainer } from "../components/PageContainer";
import { HeroSlider } from "../components/HeroSlider";
import { PromoMarquee } from "../components/PromoMarquee";
import { HomeProductRow } from "../components/HomeProductRow";
import { HomeAdminProductsSection } from "../components/HomeAdminProductsSection";
import { ScrollReveal } from "../components/ScrollReveal";
import { useProducts } from "../context/ProductsContext";
import { HOME_PRODUCT_ROWS, productsForHomeRow } from "../data/homeRows";

export function HomePage() {
  const { products } = useProducts();

  const rows = useMemo(
    () =>
      HOME_PRODUCT_ROWS.map((row) => ({
        row,
        products: productsForHomeRow(products, row),
      })),
    [products]
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

      <PageContainer className="mt-6 sm:mt-8 space-y-4 sm:space-y-5">
        {rows.map(({ row, products: rowProducts }) => (
          <HomeProductRow key={row.id} row={row} products={rowProducts} />
        ))}

        <HomeAdminProductsSection products={products} />
      </PageContainer>
    </div>
  );
}
