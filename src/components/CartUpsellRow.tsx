import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { isFlagEnabled, loadFeatureFlags } from "../lib/featureFlags";
import { useCurrency } from "../context/CurrencyContext";
import { useCart } from "../context/CartContext";
import { fetchCartUpsell } from "../api/client";
import { ProductImage } from "./ProductImage";
import type { Product } from "../types/product";

export function CartUpsellRow({
  cartItems,
}: {
  cartItems?: { product: Product; quantity: number }[];
} = {}) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const cart = useCart();
  const items = cartItems ?? cart.items;
  const [enabled, setEnabled] = useState(isFlagEnabled("cartUpsell"));
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    loadFeatureFlags().then((f) => setEnabled(Boolean(f.cartUpsell)));
  }, []);

  useEffect(() => {
    if (!enabled || !items.length) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    const ids = items.map(({ product }) => product.id);
    fetchCartUpsell(ids)
      .then((list) => {
        if (!cancelled) setProducts(list);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, items]);

  if (!enabled || !products.length) return null;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-text mb-3">
        {t("cart.upsellTitle", "Frequently bought together")}
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {products.map((p) => (
          <Link
            key={p.id}
            to={`/product/${p.id}`}
            className="min-w-[140px] max-w-[160px] rounded-xl border border-border bg-white p-3 hover:border-accent"
          >
            <ProductImage src={p.image} alt={p.title} size="thumb" />
            <p className="text-xs font-medium mt-2 line-clamp-2">{p.title}</p>
            <p className="text-sm font-bold text-accent mt-1">{formatPrice(p.price)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
