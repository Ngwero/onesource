import { useTranslation } from "react-i18next";

type Props = {
  title?: string;
  cards?: number;
};

export function KitchenShelfSkeleton({ title, cards = 6 }: Props) {
  const { t } = useTranslation();
  return (
    <section className="kitchen-ikea-row" aria-busy="true" aria-label={t("common.loading")}>
      <div className="kitchen-ikea-row-head">
        {title ? (
          <h2 className="kitchen-ikea-row-title">{title}</h2>
        ) : (
          <span className="kitchen-shelf-skeleton-line kitchen-shelf-skeleton-line--title" />
        )}
      </div>
      <div className="kitchen-ikea-row-tabs" aria-hidden />
      <div className="kitchen-ikea-row-track kitchen-shelf-skeleton-track" aria-hidden>
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="kitchen-ikea-row-item">
            <div className="kitchen-shelf-skeleton-media" />
            <span className="kitchen-shelf-skeleton-line" />
            <span className="kitchen-shelf-skeleton-line kitchen-shelf-skeleton-line--short" />
          </div>
        ))}
      </div>
    </section>
  );
}
