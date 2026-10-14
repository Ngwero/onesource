import { Link, Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { KitchenIkeaAisle } from "../components/kitchen/KitchenIkeaAisle";
import { getKitchenAisleTitle } from "../i18n/useLocalizedProduct";
import { KITCHEN_WARE_AISLES } from "../data/kitchenWare";
import { isValidKitchenAisleId } from "../utils/kitchenMode";

export function KitchenAislePage() {
  const { t } = useTranslation();
  const { aisleId } = useParams<{ aisleId: string }>();

  if (!isValidKitchenAisleId(aisleId)) {
    return <Navigate to="/kitchen/categories" replace />;
  }

  const aisle = KITCHEN_WARE_AISLES.find((a) => a.id === aisleId)!;
  const aisleTitle = getKitchenAisleTitle(aisle.id, t, aisle.title);

  return (
    <div className="kitchen-home kitchen-subpage w-full pb-20">
      <PageContainer className="kitchen-home-shell" bleed>
        <nav className="kitchen-sub-crumb" aria-label={t("common.breadcrumb")}>
          <Link to="/kitchen">{t("kitchen.brand")}</Link>
          <span aria-hidden>/</span>
          <Link to="/kitchen/categories">{t("kitchen.home.tabCategories")}</Link>
          <span aria-hidden>/</span>
          <span>{aisleTitle}</span>
        </nav>

        <header className="kitchen-aisle-hero">
          <span className="kitchen-aisle-hero-icon" aria-hidden>
            {aisle.icon}
          </span>
          <div>
            <p className="kitchen-aisle-kicker">{t("kitchen.aisleOf")}</p>
            <h1>{aisleTitle}</h1>
          </div>
        </header>

        <KitchenIkeaAisle
          key={aisle.id}
          aisleId={aisle.id}
          title={aisleTitle}
          emptyState={
            <div className="kitchen-home-empty">
              <p>{t("kitchen.empty")}</p>
              <Link to="/kitchen/categories" className="kitchen-home-reset">
                {t("kitchen.navCategories")}
              </Link>
            </div>
          }
        />
      </PageContainer>
    </div>
  );
}
