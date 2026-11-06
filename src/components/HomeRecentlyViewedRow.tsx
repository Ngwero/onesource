import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useProducts } from "../context/ProductsContext";
import { useEnsureProducts } from "../hooks/useEnsureShops";
import { getBrowsingHistory } from "../utils/userStorage";
import { ShopHomeProductRow } from "./ShopHomeProductRow";

/** Home-row carousel of products the shopper recently opened. */
export function HomeRecentlyViewedRow() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { products } = useProducts();
  const ids = useMemo(
    () => getBrowsingHistory(user?.id).map((e) => e.productId).slice(0, 16),
    [user?.id]
  );
  useEnsureProducts(ids);

  const viewed = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    return ids.map((id) => byId.get(id)).filter(Boolean) as typeof products;
  }, [products, ids]);

  if (viewed.length === 0) return null;

  return (
    <ShopHomeProductRow
      title={t("home.recentlyViewed")}
      products={viewed}
      seeAllTo="/history"
    />
  );
}
