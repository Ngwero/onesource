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

type Seller = { id: string; name: string; slug: string; bio?: string | null };
type Rating = { average: number | null; count: number; placeholder?: boolean };

export function SellerPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { enabled, ready } = useFeatureFlags();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [rating, setRating] = useState<Rating | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!enabled("marketplace")) {
      setError(true);
      setLoading(false);
      return;
    }
    if (!slug) return;
    let cancelled = false;
    fetch(`${API_BASE}/sellers/${encodeURIComponent(slug)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("nf");
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setSeller(data.seller);
        setRating(data.rating);
        setProducts((data.products ?? []) as Product[]);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, ready, enabled]);

  if (!ready || loading) {
    return (
      <PageContainer className="py-20 flex justify-center">
        <BrandLoader size={72} />
      </PageContainer>
    );
  }

  if (error || !seller) {
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
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        {t("marketplace.seller", "Marketplace seller")}
      </p>
      <h1 className="text-2xl sm:text-3xl font-bold text-text mt-1">{seller.name}</h1>
      {seller.bio && <p className="mt-3 text-text-muted max-w-2xl">{seller.bio}</p>}
      <p className="mt-2 text-sm text-text-muted">
        {rating?.average != null
          ? t("marketplace.rating", "{{avg}} · {{count}} ratings", {
              avg: rating.average,
              count: rating.count,
            })
          : t("marketplace.ratingPlaceholder", "Ratings coming soon")}
      </p>

      <h2 className="text-lg font-bold mt-10 mb-4">
        {t("marketplace.products", "Products from this seller")}
      </h2>
      {products.length === 0 ? (
        <p className="text-text-muted">
          {t("marketplace.noProducts", "No marketplace products linked yet.")}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map((p) => (
            <Link
              key={p.id}
              to={`/product/${p.id}`}
              className="rounded-xl border border-border bg-white p-3 hover:border-accent"
            >
              <ProductImage src={p.image} alt={p.title} size="thumb" />
              <p className="text-sm font-medium mt-2 line-clamp-2">{p.title}</p>
              <p className="text-accent font-bold mt-1">{formatPrice(Number(p.price))}</p>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
