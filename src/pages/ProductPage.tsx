import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Product } from "../types/product";
import { useProducts } from "../context/ProductsContext";
import { StarRating } from "../components/StarRating";
import { ProductRelatedSection } from "../components/product/ProductRelatedSection";
import { ProductCustomersAlsoViewedSection } from "../components/product/ProductCustomersAlsoViewedSection";
import { pickCustomersAlsoViewed } from "../utils/productRecommendations";
import { PageContainer } from "../components/PageContainer";
import { ProductImageGallery } from "../components/product/ProductImageGallery";
import { ProductBuyBox } from "../components/product/ProductBuyBox";
import { ProductPdpJumpNav } from "../components/product/ProductPdpJumpNav";
import { ProductMobileBuyBar } from "../components/product/ProductMobileBuyBar";
import {
  ProductDetailsBlock,
  ProductSpecificationsFull,
  ProductImportantInfo,
  ProductDescriptionSection,
} from "../components/product/ProductDetailsBlock";
import { ProductReviewsSection } from "../components/product/ProductReviewsSection";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { useLocalizedProduct, useCategoryName } from "../i18n/useLocalizedProduct";
import { normalizeCategoryId, productMatchesCategory } from "../data/categories";
import {
  buildBreadcrumbTrail,
  buildProductPageContent,
} from "../utils/productDetails";
import { resolveImageUrl } from "../utils/imageUrl";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  addBrowsingHistory,
  isInSavedList,
  toggleSavedListItem,
} from "../utils/userStorage";

/** 7 columns on large screens × 4 rows (2 extra rows vs original 2-row layout). */
const PDP_RECOMMENDATION_COUNT = 28;

const EMPTY_PRODUCT: Product = {
  id: "",
  title: "",
  price: 0,
  rating: 0,
  reviewCount: 0,
  image: "",
  category: "",
  unit: "each",
  prime: false,
  description: "",
  inStock: false,
  delivery: "",
};

export function ProductPage() {
  const { t, i18n } = useTranslation();
  const { formatPrice, freeDeliveryThreshold } = useCurrency();
  const { id } = useParams<{ id: string }>();
  const { getProductById, products } = useProducts();
  const product = id ? getProductById(id) : undefined;
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [onList, setOnList] = useState(false);
  const [showAllSpecs, setShowAllSpecs] = useState(false);
  const [shareDone, setShareDone] = useState(false);

  useEffect(() => {
    if (id) {
      addBrowsingHistory(user?.id, id);
      setOnList(isInSavedList(user?.id, id));
    }
  }, [id, user?.id]);

  useEffect(() => {
    if (!id) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    setShowAllSpecs(false);
  }, [id]);

  const related = useMemo(() => {
    if (!product) return [] as typeof products;
    return products
      .filter((p) => p.id !== product.id && productMatchesCategory(p.category, product.category))
      .slice(0, PDP_RECOMMENDATION_COUNT);
  }, [products, product]);

  const alsoViewed = useMemo(() => {
    if (!product) return [] as typeof products;
    return pickCustomersAlsoViewed(
      product,
      products,
      user?.id,
      related.map((p) => p.id),
      PDP_RECOMMENDATION_COUNT
    );
  }, [product, products, user?.id, related]);

  const localized = useLocalizedProduct(product ?? EMPTY_PRODUCT);
  const categoryName = useCategoryName(product?.category ?? "");
  const categoryId = product ? normalizeCategoryId(product.category) : "";
  const pageContent = useMemo(
    () =>
      product ? buildProductPageContent(product, categoryName, formatPrice, t) : null,
    [product, categoryName, formatPrice, t, i18n.language]
  );
  const breadcrumbs = useMemo(
    () =>
      product
        ? buildBreadcrumbTrail(categoryName, categoryId, localized.localizedTitle, t)
        : [],
    [product, categoryName, categoryId, localized.localizedTitle, t, i18n.language]
  );

  if (!product || !pageContent) {
    return (
      <PageContainer className="py-16 sm:py-20 text-center">
        <div className="card p-8 sm:p-12 max-w-md mx-auto">
          <h1 className="text-xl sm:text-2xl font-bold">{t("product.notFound")}</h1>
          <Link to="/" className="btn-primary mt-6 inline-flex">
            {t("common.backToShop")}
          </Link>
        </div>
      </PageContainer>
    );
  }

  const maxQty = Math.max(1, Math.min(10, product.stockQuantity ?? 10));
  const qtyOptions = Array.from({ length: maxQty }, (_, i) => i + 1);
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;
  const resolvedImage = resolveImageUrl(product.image);
  const unitShort = localized.localizedUnit.replace(/^per\s+/i, "");

  const handleAdd = () => addToCart(product, quantity);
  const handleToggleList = () => {
    setOnList(toggleSavedListItem(user?.id, product.id));
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: localized.localizedTitle, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareDone(true);
        setTimeout(() => setShareDone(false), 2000);
      }
    } catch {
      /* cancelled */
    }
  };

  const openSpecs = () => {
    setShowAllSpecs(true);
    requestAnimationFrame(() => {
      document.getElementById("pdp-all-specifications")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  return (
    <div className="pdp-page w-full pb-20 lg:pb-12">
      <PageContainer className="py-3 sm:py-5 max-w-[1500px]">
        <nav className="pdp-breadcrumbs" aria-label={t("common.breadcrumb")}>
          <Link to="/">{t("common.home")}</Link>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="pdp-breadcrumb-sep">
              <span aria-hidden> › </span>
              {crumb.href ? (
                <Link to={crumb.href}>{crumb.label}</Link>
              ) : (
                <span className="pdp-breadcrumb-current">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>

        <ProductPdpJumpNav />

        <div className="pdp-hero-grid">
          <div className="pdp-gallery-wrap">
            <ProductImageGallery
              imageSrc={resolvedImage}
              alt={localized.localizedTitle}
              discount={discount}
            />
          </div>

          <div className="pdp-center-col">
            <header className="pdp-header">
              <p className="pdp-brand-line">
                {t("product.brandLabel")}{" "}
                <Link to="/" className="pdp-brand-link">
                  {t("product.brandValue")}
                </Link>
              </p>
              <h1 className="pdp-title">{localized.localizedTitle}</h1>

              <div className="pdp-rating-row">
                <StarRating rating={product.rating} size="md" variant="brand" />
                <Link to="#pdp-reviews" className="pdp-ratings-link">
                  {product.reviewCount.toLocaleString()} {t("product.ratingsShort")}
                </Link>
                {product.rating >= 4 && product.reviewCount > 50 && (
                  <span className="pdp-choice-badge">{t("product.amazonChoice")}</span>
                )}
                {product.prime && (
                  <span className="pdp-prime-inline">
                    <span className="font-bold text-prime">{t("common.prime")}</span>
                  </span>
                )}
              </div>

              {pageContent.socialProof && (
                <p className="pdp-social-proof">{pageContent.socialProof}</p>
              )}

              <div className="pdp-price-block">
                {discount > 0 && (
                  <span className="pdp-deal-label">
                    {t("product.savePercent", { percent: discount })}
                  </span>
                )}
                <div className="pdp-price-row">
                  <span className="pdp-price-main">{formatPrice(product.price)}</span>
                  <span className="pdp-price-unit">
                    ({formatPrice(product.price)} / {unitShort})
                  </span>
                </div>
                {product.originalPrice && (
                  <p className="pdp-was-price">
                    {t("product.wasPrice")}{" "}
                    <span className="line-through">{formatPrice(product.originalPrice)}</span>
                    <button type="button" className="pdp-price-history">
                      {t("product.priceHistory")}
                    </button>
                  </p>
                )}
              </div>

              <div className="pdp-action-links">
                <button type="button" onClick={handleShare} className="pdp-text-link">
                  {shareDone ? t("product.linkCopied") : t("product.shareProduct")}
                </button>
                <span className="text-border" aria-hidden>
                  |
                </span>
                <button type="button" className="pdp-text-link">
                  {t("product.reportIssue")}
                </button>
              </div>
            </header>

            <div className="pdp-details-area">
              <ProductDetailsBlock content={pageContent} onSeeAllSpecs={openSpecs} />
              <ProductSpecificationsFull
                rows={pageContent.allSpecifications}
                open={showAllSpecs}
                onClose={() => setShowAllSpecs(false)}
              />
            </div>
          </div>

          <aside className="pdp-buybox hidden lg:block">
            <ProductBuyBox
              product={product}
              localized={localized}
              quantity={quantity}
              onQuantityChange={setQuantity}
              qtyOptions={qtyOptions}
              onAdd={handleAdd}
              onToggleList={handleToggleList}
              onList={onList}
              formatPrice={formatPrice}
              freeDeliveryThreshold={freeDeliveryThreshold}
            />
          </aside>
        </div>

        <div className="pdp-lower-content">
          <ProductImportantInfo ingredients={pageContent.ingredients} />
          <ProductDescriptionSection
            paragraphs={pageContent.descriptionParagraphs}
            ingredients={pageContent.ingredients}
          />
          <ProductReviewsSection
            product={product}
            customersSay={pageContent.customersSay}
          />
        </div>

      </PageContainer>

      <ProductRelatedSection
        products={related}
        categoryId={categoryId}
        categoryName={categoryName}
      />

      <ProductCustomersAlsoViewedSection products={alsoViewed} />

      <ProductMobileBuyBar
        productId={product.id}
        priceLabel={formatPrice(product.price)}
        inStock={product.inStock}
        onAdd={handleAdd}
      />
    </div>
  );
}
