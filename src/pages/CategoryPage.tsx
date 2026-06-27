import { useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ProductGrid } from "../components/ProductGrid";
import { ScrollReveal } from "../components/ScrollReveal";
import { PageContainer } from "../components/PageContainer";
import { ShopListingLayout } from "../components/shop/ShopListingLayout";
import { useProducts } from "../context/ProductsContext";
import { useCategoryName } from "../i18n/useLocalizedProduct";
import {
  getCategoryById,
  normalizeCategoryId,
  getCategoryBannerImage,
  REMOVED_CATEGORY_SLUGS,
} from "../data/categories";
import { resolveImageUrl } from "../utils/imageUrl";

export function CategoryPage() {
  const { t } = useTranslation();
  const { categoryId: rawId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { categories, getProductsByCategory } = useProducts();

  const normalizedId = rawId ? normalizeCategoryId(rawId) : "";
  const isRemovedSlug = Boolean(rawId && REMOVED_CATEGORY_SLUGS.has(rawId));
  const listingId = rawId ?? "";
  const categoryDef = normalizedId ? getCategoryById(normalizedId) : undefined;
  const category = categories.find((c) => c.id === normalizedId) ?? categoryDef;
  const categoryProducts = listingId ? getProductsByCategory(listingId) : [];
  const displayCategoryId = isRemovedSlug ? rawId! : normalizedId;
  const categoryName = useCategoryName(displayCategoryId);

  useEffect(() => {
    if (
      rawId &&
      normalizedId &&
      rawId !== normalizedId &&
      !isRemovedSlug &&
      categoryDef
    ) {
      navigate(`/category/${normalizedId}`, { replace: true });
    }
  }, [rawId, normalizedId, categoryDef, isRemovedSlug, navigate]);

  const relatedCategories = useMemo(
    () => categories.filter((c) => c.id !== normalizedId).slice(0, 8),
    [categories, normalizedId]
  );

  const hasCategoryMeta = Boolean(category ?? categoryDef ?? isRemovedSlug);

  if (!rawId || (!hasCategoryMeta && categoryProducts.length === 0)) {
    return (
      <PageContainer className="py-16 sm:py-20 text-center">
        <div className="card p-8 sm:p-12 max-w-md mx-auto w-full">
          <h1 className="text-xl sm:text-2xl font-bold">{t("category.notFound")}</h1>
          <p className="text-text-muted text-sm mt-2">{t("category.notFoundHint")}</p>
          <Link to="/categories" className="btn-primary mt-6 inline-flex">
            {t("common.allCategories")}
          </Link>
        </div>
      </PageContainer>
    );
  }

  const preview = categoryProducts[0];
  const icon = category?.icon ?? categoryDef?.icon ?? "📦";
  const heroImage = resolveImageUrl(
    getCategoryBannerImage(
      {
        id: normalizedId,
        name: categoryName,
        icon,
        image: category && "image" in category ? category.image : undefined,
      },
      preview?.image
    )
  );
  return (
    <div className="w-full pb-8 sm:pb-16">
      <section className="w-full relative h-40 sm:h-48 md:h-56 overflow-hidden">
        {heroImage ? (
          <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-accent/30 to-text/40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-text/90 to-text/20" />
        <PageContainer className="relative h-full flex flex-col justify-end pb-6 sm:pb-8">
          <ScrollReveal variant="fade-up">
            <span className="text-3xl sm:text-4xl">{icon}</span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight mt-1">
              {categoryName}
            </h1>
          </ScrollReveal>
        </PageContainer>
      </section>

      <PageContainer className="mt-4 sm:mt-6">
        <div className="flex gap-2 flex-wrap mb-4 sm:mb-6 overflow-x-auto scrollbar-hide">
          {relatedCategories.map((c) => (
            <Link
              key={c.id}
              to={`/category/${c.id}`}
              className="flex-shrink-0 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium bg-surface border border-border hover:border-accent/30 hover:bg-accent-light hover:text-accent transition-all"
            >
              {c.icon} {t(`categories.names.${c.id}`, { defaultValue: c.name })}
            </Link>
          ))}
          <Link
            to="/products"
            className="flex-shrink-0 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium text-accent border border-accent/30 hover:bg-accent-light"
          >
            {t("products.viewCatalogue")}
          </Link>
        </div>

        <ShopListingLayout
          key={displayCategoryId}
          products={categoryProducts}
          header={null}
          lockCategoryId={displayCategoryId}
          showCategoryFilter={false}
          emptyState={
            <div className="card p-8 sm:p-12 text-center w-full">
              <p className="text-text-muted">{t("category.noProducts")}</p>
              <Link to="/products" className="btn-primary mt-6 inline-flex">
                {t("common.browseAll")}
              </Link>
            </div>
          }
        >
          {(filtered) => <ProductGrid products={filtered} />}
        </ShopListingLayout>
      </PageContainer>
    </div>
  );
}
