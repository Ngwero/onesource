/** Server-side search matching + ranking (keep in sync with mobile lib/utils/search_match.dart). */

function queryVariants(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const variants = new Set([q]);
  if (q.length > 4 && q.endsWith("oes")) {
    variants.add(q.slice(0, -2));
    variants.add(q.slice(0, -1));
  } else if (q.length > 3 && q.endsWith("es")) {
    variants.add(q.slice(0, -2));
    variants.add(q.slice(0, -1));
  } else if (q.length > 3 && q.endsWith("s") && !q.endsWith("ss")) {
    variants.add(q.slice(0, -1));
  } else if (q.length > 2) {
    variants.add(`${q}s`);
    if (!q.endsWith("e")) variants.add(`${q}es`);
  }
  return [...variants];
}

/** Supabase .or() filter for ilike across title, description, category. */
export function buildSearchOrFilter(rawQuery) {
  const variants = queryVariants(rawQuery).filter((v) => v.length >= 2);
  const seen = new Set();
  const parts = [];
  for (const v of variants) {
    const esc = v.replace(/[%_,]/g, "");
    if (!esc) continue;
    for (const field of ["title", "description", "category"]) {
      const key = `${field}:${esc}`;
      if (seen.has(key)) continue;
      seen.add(key);
      parts.push(`${field}.ilike.%${esc}%`);
    }
  }
  return parts.join(",");
}

export { queryVariants };

export function productMatchesSearch(product, rawQuery) {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return false;
  const hay = [
    product.title,
    product.description,
    product.category,
    product.supplierName,
    product.unit,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const tokens = query.split(/\s+/).filter((t) => t.length >= 2);
  if (!tokens.length) return false;

  return tokens.every((token) => {
    const variants = queryVariants(token);
    return variants.some((v) => v.length >= 2 && hay.includes(v));
  });
}

function searchScore(product, query) {
  const variants = queryVariants(query);
  const title = String(product.title ?? "").toLowerCase();
  const category = String(product.category ?? "").toLowerCase();
  const description = String(product.description ?? "").toLowerCase();
  const supplier = String(product.supplierName ?? "").toLowerCase();
  let score = 0;

  for (const v of variants) {
    if (v.length < 2) continue;
    if (title === v) score += 200;
    else if (title.startsWith(v)) score += 120;
    else if (title.includes(v)) score += 70;
    if (category.includes(v)) score += 40;
    if (description.includes(v)) score += 20;
    if (supplier.includes(v)) score += 15;
  }

  score += Math.min((product.reviewCount ?? 0) / 80, 15);
  score += (product.rating ?? 0) * 2;
  if (product.prime) score += 3;
  return score;
}

export function rankSearchResults(products, rawQuery) {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return products;
  return [...products].sort((a, b) => searchScore(b, query) - searchScore(a, query));
}
