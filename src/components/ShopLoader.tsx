import { useTranslation } from "react-i18next";
import { useProducts } from "../context/ProductsContext";

type Props = { children: React.ReactNode };

export function ShopLoader({ children }: Props) {
  const { t } = useTranslation();
  const { loading, error, refresh } = useProducts();

  if (loading && !error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 page-container">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-text-muted text-sm">{t("shop.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container py-20 text-center max-w-md mx-auto">
        <div className="card p-8">
          <h2 className="text-xl font-bold text-deal mb-2">{t("shop.unavailable")}</h2>
          <p className="text-text-muted text-sm mb-4">{error}</p>
          <p className="text-xs text-text-muted mb-6">{t("shop.setupHint")}</p>
          <button type="button" onClick={() => refresh()} className="btn-primary">
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
