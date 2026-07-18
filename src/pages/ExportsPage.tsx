import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { CategoriesAisleCarousel } from "../components/categories/CategoriesAisleCarousel";
import { ExportHeroCarousel } from "../components/ExportHeroCarousel";
import { ScrollReveal } from "../components/ScrollReveal";
import { useProducts } from "../context/ProductsContext";
import { productMatchesCategory } from "../data/categories";
import type { Product } from "../types/product";

const EXPORT_CATEGORY_ID = "export-fresh-produce";

const DESTINATIONS = [
  { flag: "🇬🇧", name: "London" },
  { flag: "🇦🇪", name: "Dubai" },
  { flag: "🇧🇪", name: "Brussels" },
  { flag: "🇶🇦", name: "Doha" },
  { flag: "🇰🇪", name: "Nairobi" },
  { flag: "🇷🇼", name: "Kigali" },
];

const CERTIFICATIONS = [
  "GlobalG.A.P.",
  "HACCP",
  "Phytosanitary certified",
  "EU market compliant",
];

const SECTION_ANCHOR_STYLE = { scrollMarginTop: "calc(var(--site-header-height, 120px) + 16px)" };

export function ExportsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { products, categories, getProductCountByCategory } = useProducts();
  const [keyword, setKeyword] = useState("");
  const [commodity, setCommodity] = useState("all");

  const categoriesWithProducts = categories.filter(
    (c) => (getProductCountByCategory()[c.id] ?? 0) > 0
  );

  const exportProducts = useMemo(() => {
    const matched = products.filter((p) =>
      productMatchesCategory(p.category, EXPORT_CATEGORY_ID)
    );
    return matched;
  }, [products]);

  /** Group export products into aisle rows by commodity. */
  const exportRows = useMemo(() => {
    const MIN_ROW = 4;
    const groups = new Map<string, Product[]>();
    for (const p of exportProducts) {
      const name = p.id.startsWith("drink-")
        ? t("exports.products.drinks")
        : p.title.split("–")[0].trim() || p.title;
      const list = groups.get(name);
      if (list) list.push(p);
      else groups.set(name, [p]);
    }

    const rows: { title: string; products: Product[]; seeMoreHref: string }[] = [];
    const leftovers: Product[] = [];
    for (const [name, items] of groups) {
      if (items.length >= MIN_ROW) {
        rows.push({
          title: name,
          products: items,
          seeMoreHref: `/search?q=${encodeURIComponent(name)}`,
        });
      } else {
        leftovers.push(...items);
      }
    }
    if (leftovers.length > 0) {
      rows.push({
        title: t("exports.products.more"),
        products: leftovers,
        seeMoreHref: `/category/${EXPORT_CATEGORY_ID}`,
      });
    }
    return rows;
  }, [exportProducts, t]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = keyword.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
    } else if (commodity !== "all") {
      navigate(`/category/${commodity}`);
    } else {
      navigate(`/category/${EXPORT_CATEGORY_ID}`);
    }
  };

  const quickLinks = [
    { href: "#export-products", label: t("exports.products.title") },
    { href: "#destinations", label: t("exports.destinations.title") },
    { href: "#export-contact", label: t("exports.hero.contactCta") },
  ];

  return (
    <div className="exports-page w-full pb-24 sm:pb-16">
      {/* Full-bleed, admin-editable international hero carousel */}
      <ExportHeroCarousel>
        <form
          onSubmit={handleSearch}
          className="flex w-full max-w-3xl flex-col gap-2 rounded-2xl bg-white/95 p-2 shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:gap-0 sm:rounded-full sm:bg-white sm:p-1.5"
        >
          <span className="hidden flex-shrink-0 px-4 text-xs font-semibold uppercase tracking-wide text-text-muted sm:block">
            {t("exports.search.label")}
          </span>
          <input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("exports.search.keywordPlaceholder")}
            className="min-h-12 min-w-0 flex-1 rounded-xl bg-muted px-4 py-3 text-base outline-none placeholder:text-text-muted/70 focus:ring-2 focus:ring-accent/30 sm:min-h-0 sm:rounded-none sm:border-l sm:border-border sm:bg-transparent sm:text-sm"
          />
          <select
            value={commodity}
            onChange={(e) => setCommodity(e.target.value)}
            className="min-h-12 w-full flex-shrink-0 cursor-pointer rounded-xl bg-muted px-4 py-3 text-base text-text-muted outline-none hover:text-text sm:min-h-0 sm:w-auto sm:max-w-[220px] sm:rounded-none sm:border-l sm:border-border sm:bg-transparent sm:text-sm"
          >
            <option value="all">{t("exports.search.allCommodities")}</option>
            {categoriesWithProducts.map((c) => (
              <option key={c.id} value={c.id}>
                {t(`categories.names.${c.id}`)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="min-h-12 w-full flex-shrink-0 rounded-xl bg-accent px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-accent-hover sm:ml-1.5 sm:min-h-0 sm:w-auto sm:rounded-full sm:text-sm"
            aria-label={t("common.search")}
          >
            <span className="sm:hidden">{t("common.search")}</span>
            <span className="hidden sm:inline" aria-hidden>→</span>
          </button>
        </form>
      </ExportHeroCarousel>

      {/* Quick-links band */}
      <nav className="w-full bg-emerald-900" aria-label={t("exports.hero.kicker")}>
        <div className="page-container grid grid-cols-3 p-0 sm:flex sm:items-stretch">
          {quickLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="flex min-w-0 items-center justify-center border-r border-emerald-800 px-2 py-3 text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-emerald-50 transition-colors first:border-l hover:bg-emerald-800 hover:text-white sm:flex-1 sm:px-5 sm:py-3.5 sm:text-xs"
            >
              {link.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Certifications strip */}
      <PageContainer className="mt-4 sm:mt-8">
        <ScrollReveal variant="fade">
          <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-3 sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3.5">
            <span className="w-full text-center text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:w-auto sm:text-xs">
              {t("exports.certifications")}
            </span>
            {CERTIFICATIONS.map((c) => (
              <span
                key={c}
                className="rounded-full bg-accent-light px-2.5 py-1 text-[10px] font-medium text-accent sm:px-3 sm:text-xs"
              >
                ✓ {c}
              </span>
            ))}
          </div>
        </ScrollReveal>
      </PageContainer>

      {/* Export-grade products */}
      <PageContainer className="mt-6 sm:mt-12">
        <div id="export-products" style={SECTION_ANCHOR_STYLE}>
          <ScrollReveal>
            <div className="mb-3 flex items-end justify-between gap-3 sm:mb-6">
              <div>
                <h2 className="section-title text-lg sm:text-2xl">{t("exports.products.title")}</h2>
                <p className="section-subtitle mt-1 text-xs sm:text-sm">{t("exports.products.subtitle")}</p>
              </div>
              <Link
                to={`/category/${EXPORT_CATEGORY_ID}`}
                className="flex-shrink-0 text-xs font-semibold text-accent hover:underline sm:text-sm"
              >
                {t("common.seeAll")} →
              </Link>
            </div>
          </ScrollReveal>
          {exportRows.length > 0 ? (
            <div className="space-y-4 sm:space-y-5">
              {exportRows.map((row) => (
                <CategoriesAisleCarousel
                  key={row.title}
                  title={row.title}
                  seeMoreHref={row.seeMoreHref}
                  products={row.products}
                  actionLabelKey="checkout.placeOrder"
                />
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center text-sm text-text-muted">
              {t("exports.products.empty")}
            </div>
          )}
        </div>
      </PageContainer>

      {/* Destinations */}
      <PageContainer className="mt-6 sm:mt-12">
        <div id="destinations" style={SECTION_ANCHOR_STYLE}>
          <ScrollReveal>
            <div className="card p-4 sm:p-8">
              <h2 className="section-title text-lg sm:text-2xl">
                {t("exports.destinations.title")}
              </h2>
              <p className="section-subtitle mt-1">{t("exports.destinations.subtitle")}</p>
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
                {DESTINATIONS.map((d) => (
                  <div
                    key={d.name}
                    className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border border-border bg-muted px-2 py-3 transition-colors hover:border-accent/40 hover:bg-accent-light sm:gap-1.5 sm:px-3 sm:py-4"
                  >
                    <span className="text-2xl sm:text-3xl" aria-hidden>
                      {d.flag}
                    </span>
                    <span className="text-xs sm:text-sm font-medium">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </PageContainer>

      {/* CTA */}
      <PageContainer className="mt-6 sm:mt-12">
        <div id="export-contact" style={SECTION_ANCHOR_STYLE}>
          <ScrollReveal>
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-900 to-teal-800 px-4 py-8 text-center text-white sm:rounded-3xl sm:px-10 sm:py-14">
              <div
                className="pointer-events-none absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.25) 0, transparent 45%)",
                }}
                aria-hidden
              />
              <div className="relative mx-auto max-w-2xl">
                <h2 className="text-xl font-bold sm:text-3xl">{t("exports.cta.title")}</h2>
                <p className="mt-3 text-sm sm:text-base text-emerald-50/85 leading-relaxed">
                  {t("exports.cta.body")}
                </p>
                <a
                  href="mailto:exports@onesource.shop"
                  className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-emerald-900 shadow-lg transition-transform hover:scale-[1.03] sm:mt-6 sm:w-auto"
                >
                  ✉️ {t("exports.cta.button")}
                </a>
              </div>
            </section>
          </ScrollReveal>
        </div>
      </PageContainer>
    </div>
  );
}
