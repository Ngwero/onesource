import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PharmacyHero } from "../components/pharmacy/PharmacyHero";
import { PageContainer } from "../components/PageContainer";
import { ShopInfiniteHomeRow } from "../components/ShopInfiniteHomeRow";
import { usePharmacyCatalog } from "../hooks/usePharmacyCatalog";
import type { ProductListQuery } from "../api/client";
import { pharmacyAislePath } from "../utils/pharmacyMode";

const OFFERS_ROW_QUERY: ProductListQuery = { shop: "pharmacy", sort: "top", sale: true };

export function PharmacyShopPage() {
  const { t } = useTranslation();
  const { aisles, offers } = usePharmacyCatalog();

  const stocked = useMemo(
    () =>
      aisles
        .filter((aisle) => aisle.products.length > 0)
        .map((aisle) => ({
          ...aisle,
          label: t(`pharmacy.aisles.${aisle.id}`, { defaultValue: aisle.title }),
        })),
    [aisles, t]
  );

  return (
    <div className="pharmacy-home w-full pb-8 sm:pb-16">
      <PageContainer className="pt-4 sm:pt-6">
        <PharmacyHero />
      </PageContainer>

      <PageContainer className="mt-6 sm:mt-8 space-y-7 sm:space-y-9">
        {offers.length > 0 && (
          <ShopInfiniteHomeRow
            title={t("kitchen.home.feedOffers")}
            products={offers}
            query={OFFERS_ROW_QUERY}
            seeAllTo="/pharmacy/products?sale=1"
          />
        )}

        {stocked.map((aisle) => (
          <ShopInfiniteHomeRow
            key={aisle.id}
            title={aisle.label}
            products={aisle.products}
            query={{ shop: "pharmacy", sort: "top", aisle: aisle.id }}
            seeAllTo={pharmacyAislePath(aisle.id)}
          />
        ))}
      </PageContainer>
    </div>
  );
}
