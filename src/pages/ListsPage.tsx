import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { PageContainer } from "../components/PageContainer";
import { SavedItemRow } from "../components/SavedItemRow";
import { useProducts } from "../context/ProductsContext";
import { useSavedList } from "../context/SavedListContext";

export function ListsPage() {
  const { t } = useTranslation();
  const { products } = useProducts();
  const { savedIds } = useSavedList();

  const saved = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    return [...savedIds]
      .map((id) => byId.get(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
  }, [products, savedIds]);

  return (
    <PageContainer className="py-10 sm:py-14">
      <h1 className="text-2xl sm:text-3xl font-bold text-text">{t("accountMenu.savedItems")}</h1>
      <p className="text-sm text-text-muted mt-2">{t("lists.subtitle")}</p>

      {saved.length === 0 ? (
        <div className="card p-8 sm:p-12 mt-8 text-center max-w-lg mx-auto">
          <p className="text-text-muted">{t("lists.empty")}</p>
          <Link to="/products" className="btn-primary mt-6 inline-flex">
            {t("common.browseAll")}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:gap-4 mt-8 max-w-3xl">
          {saved.map((p) => (
            <SavedItemRow key={p.id} product={p} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
