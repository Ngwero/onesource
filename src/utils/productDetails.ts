import type { TFunction } from "i18next";
import i18n from "../i18n";
import type { Product, ProductInfo, ProductSpec } from "../types/product";
import { getCategoryById } from "../data/categories";

export type DetailRow = { labelKey: string; label?: string; value: string };

export type DetailSection = {
  id: string;
  titleKey: string;
  defaultOpen?: boolean;
  rows?: DetailRow[];
  bullets?: string[];
  paragraphs?: string[];
};

export type ProductSafety = {
  allergenStatement?: string;
  allergens: string[];
  warnings: string[];
  howToUse?: string;
  storage?: string;
  care?: string;
  suitableFor: string[];
  fromManufacturer: boolean;
};

export type ProductPageContent = {
  brand: string | null;
  ingredients: string;
  safety: ProductSafety;
  highlightsTable: DetailRow[];
  aboutBullets: string[];
  descriptionParagraphs: string[];
  itemDetails: DetailRow[];
  measurements: DetailRow[];
  allSpecifications: DetailRow[];
  warrantyParagraphs: string[];
  socialProof: string | null;
  customersSay: string | null;
};

const L = {
  itemForm: "productDetails.labels.itemForm",
  brand: "productDetails.labels.brand",
  brandName: "productDetails.labels.brandName",
  category: "productDetails.labels.category",
  countryOfOrigin: "productDetails.labels.countryOfOrigin",
  itemWeight: "productDetails.labels.itemWeight",
  numberOfItems: "productDetails.labels.numberOfItems",
  unitCount: "productDetails.labels.unitCount",
  temperatureCondition: "productDetails.labels.temperatureCondition",
  suitableFor: "productDetails.labels.suitableFor",
  bestSellersRank: "productDetails.labels.bestSellersRank",
  productId: "productDetails.labels.productId",
  customerReviews: "productDetails.labels.customerReviews",
  unitOfSale: "productDetails.labels.unitOfSale",
  price: "productDetails.labels.price",
  size: "productDetails.labels.size",
  stock: "productDetails.labels.stock",
  productName: "productDetails.labels.productName",
  storage: "productDetails.labels.storage",
  delivery: "productDetails.labels.delivery",
  primeEligible: "productDetails.labels.primeEligible",
  condition: "productDetails.labels.condition",
  material: "productDetails.labels.material",
  colour: "productDetails.labels.colour",
  capacity: "productDetails.labels.capacity",
  diameter: "productDetails.labels.diameter",
  dimensions: "productDetails.labels.dimensions",
  pieces: "productDetails.labels.pieces",
  ean: "productDetails.labels.ean",
} as const;

/** Spec keys shown with a translated label; others keep the manufacturer's label. */
const SPEC_LABELS: Record<string, string> = {
  brand: L.brand,
  material: L.material,
  colour: L.colour,
  color: L.colour,
  size: L.size,
  capacity: L.capacity,
  diameter: L.diameter,
  dimensions: L.dimensions,
  pieces: L.pieces,
  ean: L.ean,
};

const MEASUREMENT_SPEC_KEYS = new Set(["size", "capacity", "diameter", "dimensions", "pieces", "height", "length", "width", "weight", "volume"]);

export const ITEM_DETAIL_LABEL_KEYS: string[] = [
  L.itemForm,
  L.brandName,
  L.temperatureCondition,
  L.suitableFor,
  L.countryOfOrigin,
  L.productId,
  L.customerReviews,
];

export const MEASUREMENT_LABEL_KEYS: string[] = [
  L.unitOfSale,
  L.price,
  L.numberOfItems,
  L.itemWeight,
  L.size,
  L.capacity,
  L.diameter,
  L.dimensions,
  L.pieces,
  L.stock,
];

function titleBase(title: string): string {
  return title.replace(/\s*–\s*One Source$/i, "").trim();
}

const isKitchenId = (id: string) => id.startsWith("kitchen-");
const isCosmeticsId = (id: string) => id.startsWith("cosmetics-");
const isPharmacyId = (id: string) => id.startsWith("pharmacy-");

function details(product: Product): ProductInfo {
  return product.details && typeof product.details === "object" ? product.details : {};
}

/** Brand shown on the page — only when it is actually known. */
export function productBrand(product: Product, t: TFunction = i18n.t.bind(i18n)): string | null {
  const d = details(product);
  if (d.brand) return d.brand === "One Source" ? t("productDetails.values.oneSource") : d.brand;
  if (!isKitchenId(product.id) && !isCosmeticsId(product.id) && !isPharmacyId(product.id) && /–\s*One Source$/i.test(product.title)) {
    return t("productDetails.values.oneSource");
  }
  return null;
}

/** Full ingredients list, or "" when not known. Never inferred from the title. */
export function inferIngredients(product: Product): string {
  return details(product).ingredients?.trim() ?? "";
}

function parseWeightFromTitle(title: string, t: TFunction): string | null {
  const m = title.match(/(\d+(?:\.\d+)?)\s*(kg|g|lb|litre|l)\b/i);
  if (!m) return null;
  const unit = m[2].toLowerCase() === "kg" ? t("productDetails.values.kilograms") : m[2];
  return `${m[1]} ${unit}`;
}

function specRow(spec: ProductSpec): DetailRow {
  const key = SPEC_LABELS[spec.key];
  return key ? { labelKey: key, value: spec.value } : { labelKey: `spec.${spec.key}`, label: spec.label, value: spec.value };
}

function itemForm(product: Product, t: TFunction): string | null {
  const d = details(product);
  if (isKitchenId(product.id) || isCosmeticsId(product.id) || isPharmacyId(product.id)) return null;
  if (d.form) return d.form;
  const cat = getCategoryById(product.category);
  return cat?.name ? cat.name.replace(/s$/, "") : t("productDetails.forms.freshProduce");
}

export function buildProductSafety(product: Product): ProductSafety {
  const d = details(product);
  return {
    allergenStatement: d.allergenStatement,
    allergens: d.allergens ?? [],
    warnings: d.warnings ?? [],
    howToUse: d.howToUse,
    storage: d.storage,
    care: d.care,
    suitableFor: d.suitableFor ?? [],
    fromManufacturer: d.source === "manufacturer",
  };
}

export function buildAboutItemBullets(
  product: Product,
  _categoryName: string,
  t: TFunction = i18n.t.bind(i18n)
): string[] {
  const d = details(product);
  const bullets: string[] = [...(d.highlights ?? [])];
  if (!bullets.length) {
    const sentences = (product.description ?? "")
      .split(/\n+|(?<=[.!?])\s+/)
      .map((s) => s.replace(/^[•\-–]\s*/, "").trim())
      .filter((s) => s.length > 3);
    bullets.push(...sentences.slice(0, 4));
  }
  if (!isKitchenId(product.id) && !isCosmeticsId(product.id) && !isPharmacyId(product.id) && product.unit) {
    bullets.push(t("productDetails.values.soldUnit", { unit: product.unit }));
  }
  if (d.suitableFor?.length) {
    bullets.push(t("productDetails.values.suitableForList", { list: d.suitableFor.join(", ") }));
  }
  return bullets.slice(0, 8);
}

export function buildDescriptionParagraphs(product: Product): string[] {
  return (product.description ?? "")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function getSocialProof(product: Product, t: TFunction = i18n.t.bind(i18n)): string | null {
  const views = Math.max(15, Math.floor(product.reviewCount / 12) + 10);
  if (product.reviewCount >= 30 || views >= 20) {
    return t("productDetails.social.viewedPastMonth", { count: views });
  }
  return null;
}

export function getBoughtInPastMonth(
  product: Product,
  t: TFunction = i18n.t.bind(i18n)
): string | null {
  const bought = Math.max(0, product.reviewCount * 18 + 120);
  if (bought < 500) return getSocialProof(product, t);
  if (bought >= 1000) {
    const k = Math.floor(bought / 1000);
    return t("productDetails.social.boughtPastMonthK", { count: k });
  }
  return t("productDetails.social.boughtPastMonth", { count: bought.toLocaleString() });
}

export function getBestSellerBadge(
  product: Product,
  t: TFunction = i18n.t.bind(i18n)
): string | null {
  if (product.reviewCount >= 250 && product.rating >= 4.2) {
    return t("productCard.bestSellerTop");
  }
  if (product.reviewCount >= 100 && product.rating >= 4) {
    return t("productCard.bestSeller");
  }
  return null;
}

export function formatCardUnitPrice(
  product: Product,
  formatPrice: (amountUgx: number) => string,
  t: TFunction = i18n.t.bind(i18n)
): string | null {
  const unit = product.unit.replace(/^per\s+/i, "").trim();
  if (!unit) return null;
  return t("productCard.unitPrice", { price: formatPrice(product.price), unit });
}

export function getCardDeliveryDate(locale?: string): string {
  const lng = locale ?? i18n.language;
  const dateLocale =
    lng === "fr"
      ? "fr-FR"
      : lng === "sw"
        ? "sw-UG"
        : lng === "rw"
          ? "rw-RW"
          : lng === "ln"
            ? "fr-CD"
            : "en-GB";
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString(dateLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function buildCustomersSay(
  product: Product,
  t: TFunction = i18n.t.bind(i18n)
): string | null {
  if (product.reviewCount < 5) return null;
  const parts: string[] = [];
  if (product.rating >= 4.2) parts.push(t("productDetails.customersSay.freshQuality"));
  else if (product.rating >= 3.5) parts.push(t("productDetails.customersSay.mixedQuality"));
  else parts.push(t("productDetails.customersSay.concerns"));

  if (/yam|tuber|root/i.test(product.title)) {
    parts.push(t("productDetails.customersSay.yamNote"));
  } else if (/chilli|pepper/i.test(product.title)) {
    parts.push(t("productDetails.customersSay.chilliNote"));
  } else {
    parts.push(t("productDetails.customersSay.defaultNote"));
  }
  return parts.join(" ");
}

function inferBestSellersRank(
  product: Product,
  categoryName: string,
  t: TFunction
): string | null {
  if (product.reviewCount < 80) return null;
  const rank = Math.max(100, 50000 - product.reviewCount * 40);
  return t("productDetails.values.rankInCategory", {
    rank: rank.toLocaleString(),
    category: categoryName,
  });
}


export function buildHighlightsTable(
  product: Product,
  categoryName: string,
  t: TFunction = i18n.t.bind(i18n)
): DetailRow[] {
  const d = details(product);
  const rows: DetailRow[] = [];
  const form = itemForm(product, t);
  if (form) rows.push({ labelKey: L.itemForm, value: form });
  const brand = productBrand(product, t);
  if (brand) rows.push({ labelKey: L.brand, value: brand });
  rows.push({ labelKey: L.category, value: categoryName });
  if (d.origin) rows.push({ labelKey: L.countryOfOrigin, value: d.origin });
  const weight = parseWeightFromTitle(product.title, t);
  if (weight && !isKitchenId(product.id)) rows.push({ labelKey: L.itemWeight, value: weight });
  if (!isKitchenId(product.id) && !isCosmeticsId(product.id)) {
    rows.push({
      labelKey: L.unitCount,
      value: product.unit.replace(/^per\s+/i, "") || t("productDetails.values.oneUnit"),
    });
  }
  if (d.temperature) rows.push({ labelKey: L.temperatureCondition, value: d.temperature });
  if (d.suitableFor?.length) rows.push({ labelKey: L.suitableFor, value: d.suitableFor.join(", ") });
  for (const s of (d.specs ?? []).filter((s) => s.key !== "brand" && s.key !== "ean").slice(0, 6)) {
    rows.push(specRow(s));
  }
  const bsr = inferBestSellersRank(product, categoryName, t);
  if (bsr) rows.push({ labelKey: L.bestSellersRank, value: bsr });
  return rows;
}

export function buildProductPageContent(
  product: Product,
  categoryName: string,
  formatPrice: (n: number) => string,
  t: TFunction = i18n.t.bind(i18n)
): ProductPageContent {
  const d = details(product);
  const base = titleBase(product.title);
  const weight = parseWeightFromTitle(product.title, t);
  const brand = productBrand(product, t);
  const form = itemForm(product, t);
  const specs = d.specs ?? [];

  const itemDetails: DetailRow[] = [];
  if (form) itemDetails.push({ labelKey: L.itemForm, value: form });
  if (brand) itemDetails.push({ labelKey: L.brandName, value: brand });
  if (d.temperature) itemDetails.push({ labelKey: L.temperatureCondition, value: d.temperature });
  if (d.suitableFor?.length) itemDetails.push({ labelKey: L.suitableFor, value: d.suitableFor.join(", ") });
  if (d.origin) itemDetails.push({ labelKey: L.countryOfOrigin, value: d.origin });
  itemDetails.push({ labelKey: L.productId, value: product.id });
  itemDetails.push({
    labelKey: L.customerReviews,
    value: t("productDetails.values.reviewsSummary", {
      rating: product.rating.toFixed(1),
      count: product.reviewCount.toLocaleString(),
    }),
  });

  const measurements: DetailRow[] = [
    { labelKey: L.unitOfSale, value: product.unit },
    { labelKey: L.price, value: formatPrice(product.price) },
  ];
  const measureSpecs = specs.filter((s) => MEASUREMENT_SPEC_KEYS.has(s.key));
  measurements.push(...measureSpecs.map(specRow));
  if (weight && !measureSpecs.length) measurements.push({ labelKey: L.itemWeight, value: weight });
  if (product.stockQuantity != null) {
    measurements.push({
      labelKey: L.stock,
      value: t("productDetails.values.stockAvailable", { count: product.stockQuantity }),
    });
  }

  const otherSpecs = specs.filter((s) => !MEASUREMENT_SPEC_KEYS.has(s.key) && s.key !== "brand").map(specRow);

  const allSpecifications: DetailRow[] = [
    ...itemDetails,
    ...measurements,
    ...otherSpecs,
    { labelKey: L.productName, value: base },
    ...(d.storage ? [{ labelKey: L.storage, value: d.storage }] : []),
    {
      labelKey: L.delivery,
      value: product.delivery || t("productDetails.values.standardDelivery"),
    },
    {
      labelKey: L.primeEligible,
      value: product.prime ? t("productDetails.values.yes") : t("productDetails.values.no"),
    },
    { labelKey: L.condition, value: t("productDetails.values.new") },
  ];

  return {
    brand,
    ingredients: inferIngredients(product),
    safety: buildProductSafety(product),
    highlightsTable: buildHighlightsTable(product, categoryName, t),
    aboutBullets: buildAboutItemBullets(product, categoryName, t),
    descriptionParagraphs: buildDescriptionParagraphs(product),
    itemDetails,
    measurements,
    allSpecifications,
    socialProof: getSocialProof(product, t),
    customersSay: buildCustomersSay(product, t),
    warrantyParagraphs: [
      t("productDetails.warranty.p1"),
      t("productDetails.warranty.p2"),
      t("productDetails.warranty.p3"),
    ],
  };
}

export function buildProductDetailSections(
  product: Product,
  categoryName: string,
  formatPrice: (n: number) => string,
  t?: TFunction
): DetailSection[] {
  const c = buildProductPageContent(product, categoryName, formatPrice, t);
  return [
    { id: "item-details", titleKey: "product.sections.itemDetails", rows: c.itemDetails },
    { id: "measurements", titleKey: "product.sections.measurements", rows: c.measurements },
    { id: "warranty", titleKey: "product.sections.warranty", paragraphs: c.warrantyParagraphs },
    { id: "specifications", titleKey: "product.sections.specifications", rows: c.allSpecifications },
  ];
}

export function buildBreadcrumbTrail(
  categoryName: string,
  categoryId: string,
  productTitle: string,
  t: TFunction = i18n.t.bind(i18n)
): { label: string; href?: string }[] {
  const crumbs: { label: string; href?: string }[] = [
    { label: t("productDetails.breadcrumbs.grocery"), href: "/categories" },
    { label: t("productDetails.breadcrumbs.freshChilled"), href: "/categories" },
  ];

  if (categoryId === "roots-and-tubers" && /yam/i.test(productTitle)) {
    crumbs.push({
      label: t("productDetails.breadcrumbs.freshVegetables"),
      href: `/category/${categoryId}`,
    });
    crumbs.push({ label: t("productDetails.breadcrumbs.yams"), href: "/search?q=yam" });
  } else if (categoryId === "chillies-and-peppers") {
    crumbs.push({
      label: t("productDetails.breadcrumbs.freshVegetables"),
      href: `/category/${categoryId}`,
    });
    crumbs.push({
      label: t("productDetails.breadcrumbs.chilliesPeppers"),
      href: `/category/${categoryId}`,
    });
  } else {
    crumbs.push({ label: categoryName, href: `/category/${categoryId}` });
  }

  crumbs.push({ label: titleBase(productTitle) });
  return crumbs;
}

export function buildProductHighlights(
  product: Product,
  categoryName: string,
  t?: TFunction
): string[] {
  return buildAboutItemBullets(product, categoryName, t);
}

export function buildReviewHistogram(
  rating: number,
  total: number
): { stars: number; percent: number; count: number }[] {
  const weights = [0.05, 0.08, 0.12, 0.25, 0.5];
  const avg = rating;
  const adjusted = weights.map((w, idx) => {
    const star = idx + 1;
    const dist = Math.max(0.02, w * (1 + (star - avg) * 0.35));
    return dist;
  });
  const sum = adjusted.reduce((a, b) => a + b, 0);
  return [5, 4, 3, 2, 1].map((stars) => {
    const idx = 5 - stars;
    const pct = Math.round((adjusted[idx]! / sum) * 100);
    return { stars, percent: pct, count: Math.round((pct / 100) * total) };
  });
}
