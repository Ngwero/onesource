import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { fetchBuyAgainProducts } from "../api/client";
import type { Product } from "../types/product";
import { ShopHomeProductRow } from "./ShopHomeProductRow";

/** Home row of products from the signed-in user's delivered orders. */
export function HomeBuyItAgainRow() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setProducts([]);
      setLoaded(true);
      return;
    }
    setLoaded(false);
    fetchBuyAgainProducts()
      .then((list) => {
        if (!cancelled) setProducts(list);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!user || !loaded || products.length < 1) return null;

  return (
    <ShopHomeProductRow
      title={t("home.buyItAgain")}
      products={products}
      seeAllTo="/orders"
    />
  );
}
