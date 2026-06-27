import type { TFunction } from "i18next";
import i18n from "../i18n";
import type { Product } from "../types/product";
import { getCategoryById } from "../data/categories";

export type DetailRow = { labelKey: string; value: string };

export type DetailSection = {
  id: string;
  titleKey: string;
  defaultOpen?: boolean;
  rows?: DetailRow[];
  bullets?: string[];
  paragraphs?: string[];
};

export type ProductPageContent = {
  ingredients: string;
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
  specialty: "productDetails.labels.specialty",
  cuisine: "productDetails.labels.cuisine",
  bestSellersRank: "productDetails.labels.bestSellersRank",
  produceSoldAs: "productDetails.labels.produceSoldAs",
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
} as const;

export const ITEM_DETAIL_LABEL_KEYS: string[] = [
  L.itemForm,
  L.brandName,
  L.produceSoldAs,
  L.temperatureCondition,
  L.specialty,
  L.cuisine,
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
  L.stock,
];

function titleBase(title: string): string {
  return title.replace(/\s*–\s*One Source$/i, "").trim();
}

function inferOrigin(title: string, t: TFunction): string {
  if (/export/i.test(title)) return t("productDetails.origin.ugandaExport");
  if (/ghana|west africa/i.test(title)) return t("productDetails.origin.ghana");
  return t("productDetails.origin.uganda");
}

export function inferIngredients(product: Product, t: TFunction = i18n.t.bind(i18n)): string {
  const base = titleBase(product.title);
  const origin = inferOrigin(product.title, t);
  const name = base.toLowerCase();
  if (/sauce|paste|powder|flakes/i.test(base)) {
    return t("productDetails.ingredients.sauce", { name: base });
  }
  if (/yam/i.test(base)) return t("productDetails.ingredients.yam", { name: base, origin });
  if (/cassava|potato|tuber|root/i.test(base) || /roots-and-tubers/i.test(product.category)) {
    return t("productDetails.ingredients.tuber", { name, origin });
  }
  if (/chilli|pepper|habanero|bonnet/i.test(base)) {
    return t("productDetails.ingredients.chilli", { name, origin });
  }
  return t("productDetails.ingredients.default", { name, origin });
}

function inferStorage(category: string, t: TFunction): string {
  if (/chillies|pepper|herbs|vegetable|fruit/i.test(category)) {
    return t("productDetails.storage.coolDry");
  }
  if (/roots-and-tubers/i.test(category)) {
    return t("productDetails.storage.roots");
  }
  if (/fish|poultry|livestock|dairy/i.test(category)) {
    return t("productDetails.storage.chilled");
  }
  return t("productDetails.storage.default");
}

function parseWeightFromTitle(title: string, t: TFunction): string | null {
  const m = title.match(/(\d+(?:\.\d+)?)\s*(kg|g|lb|litre|l)\b/i);
  if (!m) return null;
  const unit = m[2].toLowerCase() === "kg" ? t("productDetails.values.kilograms") : m[2];
  return `${m[1]} ${unit}`;
}

function formatWeightShort(weight: string): string {
  return weight.replace(/Kilograms/i, "kg");
}

function inferItemForm(title: string, category: string, t: TFunction): string {
  if (/yam/i.test(title)) return t("productDetails.forms.yam");
  if (/nakati/i.test(title)) {
    return t("productDetails.forms.leafyGreens");
  }
  if (/bitter green/i.test(title)) {
    return t("productDetails.forms.bitterGreens");
  }
  if (/amaranth|bugga|\bdodo\b/i.test(title)) {
    return t("productDetails.forms.leafyGreens");
  }
  if (/malakwang/i.test(title)) {
    return t("productDetails.forms.leafyGreens");
  }
  if (/chilli|pepper/i.test(title)) return t("productDetails.forms.chilliPepper");
  if (/fish|tilapia/i.test(title)) return t("productDetails.forms.fish");
  if (/chicken|egg/i.test(title)) return t("productDetails.forms.poultry");
  const cat = getCategoryById(category);
  if (cat?.name) return cat.name.replace(/s$/, "");
  return t("productDetails.forms.freshProduce");
}

export function buildAboutItemBullets(
  product: Product,
  categoryName: string,
  t: TFunction = i18n.t.bind(i18n)
): string[] {
  const base = titleBase(product.title);
  const origin = inferOrigin(product.title, t);
  const weight = parseWeightFromTitle(product.title, t);
  const bullets: string[] = [
    t("productDetails.about.productOf", { name: base, origin }),
  ];

  if (weight) bullets.push(t("productDetails.values.approxWeight", { weight: formatWeightShort(weight) }));
  else if (product.unit) bullets.push(t("productDetails.values.soldUnit", { unit: product.unit }));

  if (/yam/i.test(product.title)) {
    bullets.push(t("productDetails.about.yam1"), t("productDetails.about.yam2"), t("productDetails.about.yam3"));
  } else if (/chilli|pepper|habanero|bonnet/i.test(product.title)) {
    bullets.push(
      t("productDetails.about.chilli1"),
      t("productDetails.about.chilli2"),
      t("productDetails.about.chilli3")
    );
  } else {
    const desc = product.description?.trim();
    if (desc) bullets.push(desc.split(/[.!?]/)[0] + ".");
    bullets.push(
      t("productDetails.about.freshCategory", { category: categoryName.toLowerCase() })
    );
    bullets.push(t("productDetails.about.report24h"));
  }

  if (product.prime) {
    bullets.push(t("productDetails.about.primeEligible"));
  }

  return bullets.slice(0, 6);
}

export function buildDescriptionParagraphs(
  product: Product,
  t: TFunction = i18n.t.bind(i18n)
): string[] {
  const base = titleBase(product.title);
  const origin = inferOrigin(product.title, t);
  const paras: string[] = [t("productDetails.description.intro", { name: base, origin })];

  const weight = parseWeightFromTitle(product.title, t);
  if (weight) paras.push(t("productDetails.values.approxWeight", { weight: formatWeightShort(weight) }));

  if (product.description && product.description.length > 20) {
    paras.push(product.description);
  } else if (/yam/i.test(product.title)) {
    paras.push(
      t("productDetails.description.yam1"),
      t("productDetails.description.yam2"),
      t("productDetails.description.yam3", { origin })
    );
  } else {
    paras.push(
      t("productDetails.description.farmFresh", { name: base.toLowerCase() }),
      inferStorage(product.category, t)
    );
  }

  return paras;
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
  const weight = parseWeightFromTitle(product.title, t);
  const rows: DetailRow[] = [
    { labelKey: L.itemForm, value: inferItemForm(product.title, product.category, t) },
    { labelKey: L.brand, value: t("productDetails.values.oneSource") },
    { labelKey: L.category, value: categoryName },
    { labelKey: L.countryOfOrigin, value: inferOrigin(product.title, t) },
  ];
  if (weight) rows.push({ labelKey: L.itemWeight, value: weight });
  rows.push({ labelKey: L.numberOfItems, value: "1" });
  rows.push({
    labelKey: L.unitCount,
    value: product.unit.replace(/^per\s+/i, "") || t("productDetails.values.oneUnit"),
  });
  rows.push({
    labelKey: L.temperatureCondition,
    value: /fish|poultry|livestock|dairy/i.test(product.category)
      ? t("productDetails.values.chilled")
      : t("productDetails.values.fresh"),
  });
  rows.push({ labelKey: L.specialty, value: t("productDetails.values.vegetarian") });
  rows.push({ labelKey: L.cuisine, value: t("productDetails.values.african") });
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
  const base = titleBase(product.title);
  const origin = inferOrigin(product.title, t);
  const weight = parseWeightFromTitle(product.title, t);

  const itemDetails: DetailRow[] = [
    { labelKey: L.itemForm, value: inferItemForm(product.title, product.category, t) },
    { labelKey: L.brandName, value: t("productDetails.values.oneSource") },
    { labelKey: L.produceSoldAs, value: t("productDetails.values.loose") },
    { labelKey: L.temperatureCondition, value: t("productDetails.values.fresh") },
    { labelKey: L.specialty, value: t("productDetails.values.vegetarian") },
    { labelKey: L.cuisine, value: t("productDetails.values.african") },
    { labelKey: L.countryOfOrigin, value: origin },
    { labelKey: L.productId, value: product.id },
    {
      labelKey: L.customerReviews,
      value: t("productDetails.values.reviewsSummary", {
        rating: product.rating.toFixed(1),
        count: product.reviewCount.toLocaleString(),
      }),
    },
  ];

  const measurements: DetailRow[] = [
    { labelKey: L.unitOfSale, value: product.unit },
    { labelKey: L.price, value: formatPrice(product.price) },
    { labelKey: L.numberOfItems, value: "1" },
  ];
  if (weight) {
    measurements.push({ labelKey: L.itemWeight, value: weight });
    measurements.push({
      labelKey: L.size,
      value: t("productDetails.values.packOfOne", { weight: formatWeightShort(weight) }),
    });
  }
  if (product.stockQuantity != null) {
    measurements.push({
      labelKey: L.stock,
      value: t("productDetails.values.stockAvailable", { count: product.stockQuantity }),
    });
  }

  const allSpecifications: DetailRow[] = [
    ...itemDetails,
    ...measurements,
    { labelKey: L.productName, value: base },
    { labelKey: L.storage, value: inferStorage(product.category, t) },
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
    ingredients: inferIngredients(product, t),
    highlightsTable: buildHighlightsTable(product, categoryName, t),
    aboutBullets: buildAboutItemBullets(product, categoryName, t),
    descriptionParagraphs: buildDescriptionParagraphs(product, t),
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
