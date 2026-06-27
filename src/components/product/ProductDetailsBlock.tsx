import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { ProductPageContent, DetailRow } from "../../utils/productDetails";
import {
  ITEM_DETAIL_LABEL_KEYS,
  MEASUREMENT_LABEL_KEYS,
} from "../../utils/productDetails";

function SpecTable({ rows }: { rows: DetailRow[] }) {
  const { t } = useTranslation();
  return (
    <table className="pdp-spec-table w-full text-sm">
      <tbody>
        {rows.map((row) => (
          <tr key={row.labelKey}>
            <th scope="row">{t(row.labelKey)}</th>
            <td>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type AccordionProps = {
  id: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

function DetailAccordion({ id, title, open, onToggle, children }: AccordionProps) {
  return (
    <div className="pdp-detail-accordion">
      <button
        type="button"
        id={`${id}-trigger`}
        className="pdp-detail-accordion-trigger"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={onToggle}
      >
        <span>{title}</span>
        <svg
          className={`pdp-detail-accordion-chevron ${open ? "is-open" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-trigger`} className="pdp-detail-accordion-panel">
          {children}
        </div>
      )}
    </div>
  );
}

type Props = {
  content: ProductPageContent;
  onSeeAllSpecs: () => void;
};

export function ProductDetailsBlock({ content, onSeeAllSpecs }: Props) {
  const { t } = useTranslation();
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>("item-details");

  const aboutVisible = aboutExpanded
    ? content.aboutBullets
    : content.aboutBullets.slice(0, 3);

  const toggleAccordion = (id: string) => {
    setOpenAccordion((prev) => (prev === id ? null : id));
  };

  return (
    <div className="pdp-details-block">
      <section className="pdp-details-section" aria-labelledby="pdp-ingredients-heading">
        <h2 id="pdp-ingredients-heading" className="pdp-details-heading">
          {t("product.sections.ingredients")}
        </h2>
        <p className="pdp-ingredients-text">{content.ingredients}</p>
      </section>

      <hr className="pdp-hr" />

      <section className="pdp-details-section" aria-labelledby="pdp-product-details-heading">
        <h2 id="pdp-product-details-heading" className="pdp-details-heading-lg">
          {t("product.productDetailsHeading")}
        </h2>

        <h3 className="pdp-details-subheading">{t("product.sections.highlights")}</h3>
        <div className="pdp-highlights-card">
          <SpecTable rows={content.highlightsTable} />
        </div>

        <h3 id="pdp-about" className="pdp-details-subheading mt-6 scroll-mt-24">
          {t("product.aboutItem")}
        </h3>
        <ul className="pdp-about-list">
          {aboutVisible.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
        {content.aboutBullets.length > 3 && (
          <button
            type="button"
            className="pdp-show-more"
            onClick={() => setAboutExpanded((v) => !v)}
          >
            {aboutExpanded ? t("product.showLess") : t("product.showMore")}
          </button>
        )}

        <DetailAccordion
          id="item-details"
          title={t("product.sections.itemDetails")}
          open={openAccordion === "item-details"}
          onToggle={() => toggleAccordion("item-details")}
        >
          <SpecTable rows={content.itemDetails} />
        </DetailAccordion>

        <DetailAccordion
          id="measurements"
          title={t("product.sections.measurements")}
          open={openAccordion === "measurements"}
          onToggle={() => toggleAccordion("measurements")}
        >
          <SpecTable rows={content.measurements} />
        </DetailAccordion>

        <DetailAccordion
          id="warranty"
          title={t("product.sections.warranty")}
          open={openAccordion === "warranty"}
          onToggle={() => toggleAccordion("warranty")}
        >
          <div className="space-y-3 text-sm text-text-muted leading-relaxed">
            {content.warrantyParagraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </DetailAccordion>

        <button type="button" className="pdp-see-all-specs" onClick={onSeeAllSpecs}>
          {t("product.seeAllSpecifications")}
        </button>
      </section>
    </div>
  );
}

export function ProductSpecificationsFull({
  rows,
  open,
  onClose,
}: {
  rows: DetailRow[];
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  if (!open) return null;

  const itemRows = rows.filter((r) => ITEM_DETAIL_LABEL_KEYS.includes(r.labelKey));
  const measureRows = rows.filter((r) => MEASUREMENT_LABEL_KEYS.includes(r.labelKey));
  const otherRows = rows.filter(
    (r) => !itemRows.includes(r) && !measureRows.includes(r)
  );

  return (
    <section className="pdp-spec-full scroll-mt-24" id="pdp-all-specifications">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="pdp-details-heading-lg">{t("product.allSpecifications")}</h2>
        <button type="button" className="text-sm text-accent hover:underline font-medium" onClick={onClose}>
          {t("product.hideSpecifications")}
        </button>
      </div>
      {itemRows.length > 0 && (
        <>
          <h3 className="pdp-details-subheading">{t("product.sections.itemDetails")}</h3>
          <SpecTable rows={itemRows} />
        </>
      )}
      {measureRows.length > 0 && (
        <>
          <h3 className="pdp-details-subheading mt-6">{t("product.sections.measurements")}</h3>
          <SpecTable rows={measureRows} />
        </>
      )}
      {otherRows.length > 0 && (
        <>
          <h3 className="pdp-details-subheading mt-6">{t("product.productInformation")}</h3>
          <SpecTable rows={otherRows} />
        </>
      )}
    </section>
  );
}

export function ProductImportantInfo({ ingredients }: { ingredients: string }) {
  const { t } = useTranslation();
  return (
    <section className="pdp-important-info">
      <h2 className="pdp-details-heading-lg">{t("product.importantInformation")}</h2>
      <h3 className="pdp-details-subheading">{t("product.sections.ingredients")}:</h3>
      <p className="text-sm text-text mb-4">{ingredients}</p>
      <h3 className="pdp-details-subheading">{t("product.legalDisclaimer")}</h3>
      <p className="text-xs text-text-muted leading-relaxed">{t("product.legalDisclaimerText")}</p>
      <p className="text-xs text-text-muted leading-relaxed mt-3">{t("product.disclaimerText")}</p>
    </section>
  );
}

export function ProductDescriptionSection({
  paragraphs,
  ingredients,
}: {
  paragraphs: string[];
  ingredients: string;
}) {
  const { t } = useTranslation();
  return (
    <section id="pdp-description" className="pdp-description-section scroll-mt-24">
      <h2 className="pdp-details-heading-lg">{t("product.productDescription")}</h2>
      <h3 className="pdp-details-subheading">{t("product.descriptionSubheading")}</h3>
      <div className="space-y-3 text-sm text-text leading-relaxed">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <h3 className="pdp-details-subheading mt-6">{t("product.sections.ingredients")}</h3>
      <p className="text-sm text-text">{ingredients}</p>
    </section>
  );
}
