import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { PageContainer } from "../components/PageContainer";
import { ProductCard } from "../components/ProductCard";
import { useAuth } from "../context/AuthContext";
import { useProducts } from "../context/ProductsContext";
import { getBrowsingHistory } from "../utils/userStorage";

export function HistoryPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { products } = useProducts();

  const viewed = useMemo(() => {
    const order = getBrowsingHistory(user?.id).map((e) => e.productId);
    const byId = new Map(products.map((p) => [p.id, p]));
    return order.map((id) => byId.get(id)).filter(Boolean) as typeof products;
  }, [products, user?.id]);

  return (
    <PageContainer className="py-10 sm:py-14">
      <h1 className="text-2xl sm:text-3xl font-bold text-text">
        {t("accountMenu.browsingHistory")}
      </h1>
      <p className="text-sm text-text-muted mt-2">{t("history.subtitle")}</p>

      {viewed.length === 0 ? (
        <div className="card p-8 sm:p-12 mt-8 text-center max-w-lg mx-auto">
          <p className="text-text-muted">{t("history.empty")}</p>
          <Link to="/products" className="btn-primary mt-6 inline-flex">
            {t("common.browseAll")}
          </Link>
        </div>
      ) : (
        <div className="product-grid mt-8">
          {viewed.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
