import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { PHARMACY_AISLES } from "../data/pharmacy";
import { pharmacyAislePath } from "../utils/pharmacyMode";

export function PharmacyCategoriesPage() {
  const { t } = useTranslation();

  return (
    <div className="cos-page">
      <PageContainer className="cos-shell">
        <nav className="cos-crumb" aria-label={t("common.breadcrumb")}>
          <Link to="/pharmacy">{t("pharmacy.brand")}</Link>
          <span aria-hidden>›</span>
          <span>{t("pharmacy.navCategories")}</span>
        </nav>
        <header className="cos-page-head">
          <h1>{t("pharmacy.navCategories")}</h1>
          <p>{t("pharmacy.lede")}</p>
        </header>
        <div className="cos-cat-grid">
          {PHARMACY_AISLES.map((aisle) => (
            <Link key={aisle.id} to={pharmacyAislePath(aisle.id)} className="cos-cat-tile">
              <span className="cos-cat-body">
                <strong>
                  {aisle.icon} {t(`pharmacy.aisles.${aisle.id}`, { defaultValue: aisle.title })}
                </strong>
              </span>
            </Link>
          ))}
        </div>
      </PageContainer>
    </div>
  );
}
