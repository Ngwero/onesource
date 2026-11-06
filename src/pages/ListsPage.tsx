import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { PageContainer } from "../components/PageContainer";
import { SavedItemRow } from "../components/SavedItemRow";
import { useProducts } from "../context/ProductsContext";
import { useEnsureProducts } from "../hooks/useEnsureShops";
import { useSavedList } from "../context/SavedListContext";
import { useAuth } from "../context/AuthContext";
import { createWishlistShareLink, syncWishlist } from "../api/client";
import { isFlagEnabled } from "../lib/featureFlags";

export function ListsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { products } = useProducts();
  const { savedIds } = useSavedList();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  useEnsureProducts([...savedIds]);

  const saved = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    return [...savedIds]
      .map((id) => byId.get(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
  }, [products, savedIds]);

  return (
    <PageContainer className="py-10 sm:py-14">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text">{t("accountMenu.savedItems")}</h1>
          <p className="text-sm text-text-muted mt-2">{t("lists.subtitle")}</p>
        </div>
        {user && isFlagEnabled("wishlistsShare") && saved.length > 0 && (
          <button
            type="button"
            className="btn-secondary text-sm min-h-[40px]"
            disabled={shareBusy}
            onClick={async () => {
              setShareBusy(true);
              await syncWishlist([...savedIds]);
              const path = await createWishlistShareLink();
              if (path) setShareUrl(`${window.location.origin}${path}`);
              setShareBusy(false);
            }}
          >
            {t("lists.share")}
          </button>
        )}
      </div>
      {shareUrl && (
        <p className="text-sm mt-3 break-all">
          {t("lists.shareLink")}:{" "}
          <a className="text-accent underline" href={shareUrl}>
            {shareUrl}
          </a>
        </p>
      )}

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
