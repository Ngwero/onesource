import { useTranslation } from "react-i18next";

type Props = {
  sentinelRef: (el: HTMLElement | null) => void;
  hasMore: boolean;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  /** Number of products shown once the list is exhausted. */
  count: number;
  className?: string;
};

/** Bottom of an endless product list: load trigger, spinner, retry and end-of-list note. */
export function InfiniteScrollFooter({
  sentinelRef,
  hasMore,
  loading = false,
  error = false,
  onRetry,
  count,
  className = "",
}: Props) {
  const { t } = useTranslation();

  return (
    <div className={`infinite-footer ${className}`.trim()} aria-live="polite">
      {hasMore && <div ref={sentinelRef} className="infinite-footer-sentinel" aria-hidden />}
      {error ? (
        <div className="infinite-footer-error">
          <p>{t("listing.loadError")}</p>
          {onRetry && (
            <button type="button" className="infinite-footer-retry" onClick={onRetry}>
              {t("common.retry")}
            </button>
          )}
        </div>
      ) : hasMore || loading ? (
        <div className="infinite-footer-loading" role="status">
          <span className="infinite-footer-spinner" aria-hidden />
          <span>{t("listing.loadingMore")}</span>
        </div>
      ) : count > 0 ? (
        <p className="infinite-footer-end">{t("listing.endOfResults", { count })}</p>
      ) : null}
    </div>
  );
}

type SkeletonProps = {
  /** Grid class of the listing, so placeholders line up with real cards. */
  gridClassName: string;
  cards?: number;
};

export function ProductGridSkeleton({ gridClassName, cards = 8 }: SkeletonProps) {
  const { t } = useTranslation();
  return (
    <div className={gridClassName} aria-busy="true" aria-label={t("common.loading")}>
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="product-skeleton-card" aria-hidden>
          <div className="kitchen-shelf-skeleton-media" />
          <span className="kitchen-shelf-skeleton-line" />
          <span className="kitchen-shelf-skeleton-line kitchen-shelf-skeleton-line--short" />
        </div>
      ))}
    </div>
  );
}
