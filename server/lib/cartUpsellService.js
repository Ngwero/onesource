import { alsoBoughtProductIds } from "./recommendationsService.js";

/**
 * Cart / checkout upsell suggestions.
 * Prefer co-occurrence; fall back to aisle/category sibling rules
 * (e.g. cooking oil → kitchen pans).
 */

const AISLE_FALLBACKS = [
  { match: /oil|cooking oil|sunflower|vegetable oil/i, categoryHints: ["kitchen-ware"], titleHints: [/pan/i, /skillet/i, /wok/i] },
  { match: /rice|posho|flour|maize/i, categoryHints: [], titleHints: [/sauce/i, /beans/i] },
  { match: /chicken|beef|meat|fish/i, categoryHints: ["fresh-vegetables", "kitchen-ware"], titleHints: [/spice/i, /grill/i, /pan/i] },
  { match: /milk|butter|yoghurt|yogurt/i, categoryHints: ["fresh-fruits"], titleHints: [/bread/i, /cereal/i] },
];

/** Compat for GET /api/cart/suggestions?productIds=… */
export async function cartSuggestions(db, productIds, { limit = 8 } = {}) {
  const ids = (productIds ?? []).map(String).filter(Boolean);
  if (!ids.length) return { productIds: [], source: "empty" };
  const cartProducts = ids.map((id) => ({ id, title: "", category: "" }));
  try {
    const { data } = await db.from("products").select("id, title, category").in("id", ids);
    for (const row of data ?? []) {
      const p = cartProducts.find((c) => c.id === row.id);
      if (p) {
        p.title = row.title || "";
        p.category = row.category || "";
      }
    }
  } catch {
    /* titles optional for also-bought */
  }
  const rows = await suggestCartUpsells(db, cartProducts, { limit });
  return {
    productIds: rows.map((r) => String(r.id)),
    source: "cooccurrence+aisle",
  };
}

export async function suggestCartUpsells(db, cartProducts, { limit = 6 } = {}) {
  const cart = (cartProducts ?? []).filter((p) => p?.id);
  if (!cart.length) return [];

  const cartIds = new Set(cart.map((p) => String(p.id)));
  const scores = new Map();

  for (const product of cart.slice(0, 8)) {
    const peers = await alsoBoughtProductIds(db, product.id, { limit: 12 });
    for (const id of peers) {
      if (cartIds.has(id)) continue;
      scores.set(id, (scores.get(id) ?? 0) + 3);
    }
  }

  // Aisle / keyword rules when co-occurrence is thin
  if (scores.size < limit) {
    const sampleIds = [];
    for (const product of cart) {
      const title = String(product.title || "");
      const cat = String(product.category || "");
      for (const rule of AISLE_FALLBACKS) {
        if (!rule.match.test(title) && !rule.match.test(cat)) continue;
        // Pull a few kitchen / related SKUs by category from DB if available
        for (const hint of rule.categoryHints) {
          sampleIds.push({ category: hint, titleHints: rule.titleHints });
        }
      }
    }

    for (const sample of sampleIds.slice(0, 3)) {
      try {
        let q = db
          .from("products")
          .select("id, title, category, price, image, in_stock, stock_quantity, published, details")
          .eq("published", true)
          .eq("in_stock", true)
          .gt("stock_quantity", 0)
          .limit(24);
        if (sample.category) q = q.eq("category", sample.category);
        // Avoid unpublished kitchen small-furniture / extractor-hoods if present in details
        const { data } = await q;
        for (const row of data ?? []) {
          const id = String(row.id);
          if (cartIds.has(id)) continue;
          const details = row.details && typeof row.details === "object" ? row.details : {};
          const hidden = JSON.stringify(details.hiddenReason || details.sourcing || "");
          if (/extractor-hood|small-furniture/i.test(id) || /extractor|small-furniture/i.test(hidden)) continue;
          const title = String(row.title || "");
          const hintHit = (sample.titleHints || []).some((re) => re.test(title));
          scores.set(id, (scores.get(id) ?? 0) + (hintHit ? 2 : 1));
        }
      } catch {
        /* degrade */
      }
    }
  }

  const ranked = [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([id]) => id);

  if (!ranked.length) return [];

  const { data: rows } = await db
    .from("products")
    .select("id, title, price, original_price, image, category, unit, in_stock, stock_quantity, published, prime, rating, review_count, description, delivery")
    .in("id", ranked)
    .eq("published", true)
    .eq("in_stock", true);

  const byId = new Map((rows ?? []).map((r) => [String(r.id), r]));
  return ranked.map((id) => byId.get(id)).filter(Boolean);
}
