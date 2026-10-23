import { useTranslation } from "react-i18next";

type Props = {
  title?: string;
  cards?: number;
};

export function KitchenShelfSkeleton({ title, cards = 6 }: Props) {
  const { t } = useTranslation();
  return (
    <section className="w-full min-w-0" aria-busy="true" aria-label={t("common.loading")}>
      <div className="mb-3">
        {title ? (
          <h2 className="section-title text-xl sm:text-2xl">{title}</h2>
        ) : (
          <span className="kitchen-shelf-skeleton-line kitchen-shelf-skeleton-line--title" />
        )}
      </div>
      <div className="home-product-row" aria-hidden>
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="home-product-row-item">
            <div className="kitchen-shelf-skeleton-media" />
            <span className="kitchen-shelf-skeleton-line" />
            <span className="kitchen-shelf-skeleton-line kitchen-shelf-skeleton-line--short" />
          </div>
        ))}
      </div>
    </section>
  );
}
