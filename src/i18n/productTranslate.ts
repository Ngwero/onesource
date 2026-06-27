import type { TFunction } from "i18next";
import { applyProductTermRules } from "./productTermRules.mjs";

const BRAND_SUFFIX = /\s*–\s*One Source$/i;

function brandSuffix(t: TFunction): string {
  return ` – ${t("common.brand")}`;
}

/** i18next returns the key when missing and defaultValue is empty — treat as no translation. */
function resolved(t: TFunction, key: string, fallback: string): string | null {
  const value = t(key, { defaultValue: fallback });
  if (!value || value === key) return null;
  return value;
}

/** Stable key for a title segment or full title (without brand). */
export function segmentKey(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function translateSegment(segment: string, t: TFunction, lang: string): string {
  const trimmed = segment.trim();
  if (!trimmed) return trimmed;

  const key = segmentKey(trimmed);
  const fromGlossary = t(`products.terms.${key}`, { defaultValue: trimmed });
  if (fromGlossary && fromGlossary !== key && fromGlossary !== trimmed) {
    return fromGlossary;
  }

  const fromRules = applyProductTermRules(trimmed, lang);
  return fromRules !== trimmed ? fromRules : trimmed;
}

/**
 * Translate a product title/description stored in English in the DB.
 * Splits on " – ", translates each part via products.terms, preserves " – One Source".
 */
export function translateProductText(
  text: string,
  t: TFunction,
  kind: "title" | "description" | "delivery",
  lang: string
): string {
  if (!text?.trim()) return text;

  const hasBrand = BRAND_SUFFIX.test(text);
  const base = text.replace(BRAND_SUFFIX, "").trim();

  const fullSlug = segmentKey(base);
  const byTitleKey = `products.byTitle.${fullSlug}.${kind}`;
  const byTitle = resolved(t, byTitleKey, base);
  if (byTitle && byTitle !== base) {
    return hasBrand && kind === "title" ? `${byTitle}${brandSuffix(t)}` : byTitle;
  }

  if (kind === "title") {
    const parts = base.split(" – ").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      const translated = parts.map((p) => translateSegment(p, t, lang)).join(" – ");
      const changed = translated !== base;
      if (changed) return hasBrand ? `${translated}${brandSuffix(t)}` : translated;
    } else {
      const single = translateSegment(base, t, lang);
      if (single !== base) return hasBrand ? `${single}${brandSuffix(t)}` : single;
    }
    return hasBrand ? `${base}${brandSuffix(t)}` : base;
  }

  if (kind === "delivery") {
    return translateDeliveryText(text, t);
  }

  return translateDescriptionText(base, t, lang);
}

/** Common delivery phrase replacements after term lookup. */
function translateDeliveryText(text: string, t: TFunction): string {
  const freeOver = text.match(/FREE same-day delivery on orders over USh\s*([\d,]+)/i);
  if (freeOver) {
    return t("products.delivery.freeOver", {
      amount: freeOver[1],
      defaultValue: text,
    });
  }
  if (/FREE same-day delivery Tomorrow/i.test(text)) {
    return t("products.delivery.freeTomorrow", { defaultValue: text });
  }
  if (/FREE same-day delivery/i.test(text)) {
    return t("products.delivery.freeSameDay", { defaultValue: text });
  }
  const freeDelivery = text.match(/FREE delivery on orders over USh\s*([\d,]+)/i);
  if (freeDelivery) {
    return t("products.delivery.freeOver", {
      amount: freeDelivery[1],
      defaultValue: text,
    });
  }
  return text;
}

function translateDescriptionText(text: string, t: TFunction, lang: string): string {
  const listed = /Listed for "([^"]+)" search/i.exec(text);
  if (listed) {
    return t("products.description.listedForSearch", {
      keyword: listed[1],
      defaultValue: text,
    });
  }
  if (/Upload your product photo/i.test(text)) {
    return t("products.description.uploadPhoto", { defaultValue: text });
  }
  const firstSentence = text.split(/\.\s+/)[0] ?? text;
  if (firstSentence !== text) {
    const translated = translateSegment(firstSentence, t, lang);
    if (translated !== firstSentence) {
      return text.replace(firstSentence, translated);
    }
  }
  const term = translateSegment(text, t, lang);
  return term !== text ? term : text;
}

export function localizedProductField(
  product: { id: string; title: string; description: string; delivery: string },
  t: TFunction,
  field: "title" | "description" | "delivery",
  lang: string
): string {
  const raw = product[field];

  // Legacy demo products (numeric ids 1–24) may have full entries in products.byId
  if (/^\d+$/.test(product.id)) {
    const byIdKey = `products.byId.${product.id}.${field}`;
    const byId = resolved(t, byIdKey, raw);
    if (byId && byId !== raw) return byId;
  }

  return translateProductText(raw, t, field, lang);
}
