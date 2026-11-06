import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { BrandLoader } from "../components/BrandLoader";
import { ProductImage } from "../components/ProductImage";
import { useCurrency } from "../context/CurrencyContext";
import { useFeatureFlags } from "../hooks/useFeatureFlags";
import type { Product } from "../types/product";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export function SharedWishlistPage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { enabled, ready } = useFeatureFlags();
  const [name, setName] = useState("Wishlist");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!enabled("wishlists") || !enabled("wishlistsShare")) {
      setError("not-enabled");
      setLoading(false);
      return;
    }
    if (!token) return;
    let cancelled = false;
    fetch(`${API_BASE}/wishlists/shared/${encodeURIComponent(token)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("not-found");
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setName(data.name || "Wishlist");
        setProducts((data.products ?? []) as Product[]);
      })
      .catch(() => {
        if (!cancelled) setError("not-found");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, ready, enabled]);

  if (!ready || loading) {
    return (
      <PageContainer className="py-20 flex justify-center">
        <BrandLoader size={72} />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer className="py-14 text-center">
        <p className="text-text-muted">{t("common.notFound")}</p>
        <Link to="/products" className="btn-primary mt-6 inline-flex">
          {t("common.browseAll")}
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="py-10 sm:py-14">
      <h1 className="text-2xl sm:text-3xl font-bold text-text">{name}</h1>
      <p className="text-sm text-text-muted mt-2">
        {t("lists.sharedSubtitle", "A shared One Source wishlist.")}
      </p>
      {products.length === 0 ? (
        <p className="mt-8 text-text-muted">{t("lists.empty")}</p>
      ) : (
        <ul className="mt-8 space-y-3 max-w-3xl">
          {products.map((p) => (
            <li key={p.id}>
              <Link
                to={`/product/${p.id}`}
                className="card p-3 sm:p-4 flex gap-3 items-center hover:border-accent"
              >
                <ProductImage src={p.image} alt={p.title} size="thumb" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium line-clamp-2">{p.title}</p>
                  <p className="text-accent font-bold mt-1">{formatPrice(p.price)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
