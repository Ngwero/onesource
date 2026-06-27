/**
 * Ensure each search keyword has at least N products (default 20).
 * Only appends new rows — never deletes existing products.
 *
 *   cd server && npm run seed:fill-keywords
 *   cd server && npm run seed:fill-keywords -- --min=20
 *   cd server && npm run seed:fill-keywords -- --keyword=chicken
 *   cd server && npm run seed:fill-keywords -- --dry-run
 *   cd server && npm run seed:fill-keywords -- --audit
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";
import { unsplashImage } from "../data/bulkCatalog.js";
import { productMatchesSearch } from "../lib/productSearchMatch.js";
import {
  KEYWORD_CATALOG,
  MIN_PRODUCTS_PER_KEYWORD,
  AUDIT_SEARCH_TERMS,
} from "../data/keywordCatalog.js";

function parseArgs() {
  const minArg = process.argv.find((a) => a.startsWith("--min="));
  const kwArg = process.argv.find((a) => a.startsWith("--keyword="));
  return {
    min: minArg ? Number(minArg.split("=")[1]) : MIN_PRODUCTS_PER_KEYWORD,
    keyword: kwArg ? kwArg.split("=")[1].toLowerCase() : null,
    dryRun: process.argv.includes("--dry-run"),
    audit: process.argv.includes("--audit"),
  };
}

function randomPrice(base = 5000) {
  return Math.round((base + Math.floor(Math.random() * 35000)) / 100) * 100;
}

async function fetchAllProducts(db) {
  const all = [];
  let from = 0;
  const pageSize = 500;
  while (true) {
    const { data, error } = await db
      .from("products")
      .select("id, title, description, category")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

function buildProduct({ keywordId, categoryId, template, index, image }) {
  const slug = String(index + 1).padStart(2, "0");
  const id = `fill-kw-${keywordId}-${slug}`;
  const price = randomPrice(4000 + index * 600);
  const title = `${template.name} – One Source`;

  return {
    row: seedRowFromJson({
      id,
      title,
      price,
      originalPrice: index % 3 === 0 ? Math.round(price * 1.18) : undefined,
      rating: Number((4 + Math.random() * 0.95).toFixed(1)),
      reviewCount: Math.floor(80 + Math.random() * 5000),
      image,
      category: categoryId,
      unit: template.unit ?? "each",
      prime: Math.random() > 0.3,
      description: `${template.name}. Listed for "${keywordId}" search. Upload your product photo in admin to replace the placeholder.`,
      inStock: true,
      stockQuantity: 30 + Math.floor(Math.random() * 150),
      delivery: "FREE same-day delivery on orders over USh 100,000",
    }),
    id,
    title,
  };
}

async function runAudit(existing, min) {
  const terms = [...new Set([...AUDIT_SEARCH_TERMS, ...KEYWORD_CATALOG.map((k) => k.searchQuery)])];
  const rows = terms.map((term) => {
    const count = existing.filter((p) => productMatchesSearch(p, term)).length;
    return { term, count, ok: count >= min };
  });
  rows.sort((a, b) => a.count - b.count);

  const below = rows.filter((r) => !r.ok);
  console.log(`\nSearch audit (target ≥${min} products per term):\n`);
  for (const r of rows) {
    const flag = r.ok ? "ok" : "LOW";
    console.log(`  ${r.term.padEnd(14)} ${String(r.count).padStart(4)}  [${flag}]`);
  }
  if (below.length) {
    console.log(`\n${below.length} term(s) below ${min}: ${below.map((r) => r.term).join(", ")}`);
    console.log("Run: npm run seed:fill-keywords");
  } else {
    console.log(`\nAll ${rows.length} audited terms meet the target.`);
  }
}

async function main() {
  const { min, keyword: onlyKeyword, dryRun, audit } = parseArgs();
  const db = requireSupabase();
  const existing = await fetchAllProducts(db);

  if (audit) {
    await runAudit(existing, min);
    return;
  }

  const catalog = onlyKeyword
    ? KEYWORD_CATALOG.filter((k) => k.id === onlyKeyword || k.searchQuery === onlyKeyword)
  : KEYWORD_CATALOG;

  if (!catalog.length) {
    console.error(`Unknown keyword: ${onlyKeyword}`);
    console.error("Available:", KEYWORD_CATALOG.map((k) => k.id).join(", "));
    process.exit(1);
  }

  const existingIds = new Set(existing.map((p) => p.id));
  const toUpsert = [];
  const summary = [];

  for (const kw of catalog) {
    const matched = existing.filter((p) => productMatchesSearch(p, kw.searchQuery));
    const usedTitles = new Set(matched.map((p) => p.title.toLowerCase()));
    let need = Math.max(0, min - matched.length);

    if (need === 0) {
      summary.push({ id: kw.id, had: matched.length, added: 0 });
      continue;
    }

    let added = 0;
    let templateIdx = 0;

    while (need > 0 && templateIdx < kw.templates.length) {
      const template = kw.templates[templateIdx++];
      const probeTitle = `${template.name} – One Source`;
      if (usedTitles.has(probeTitle.toLowerCase())) continue;

      let index = added;
      let id = `fill-kw-${kw.id}-${String(index + 1).padStart(2, "0")}`;
      while (existingIds.has(id)) {
        index += 1;
        id = `fill-kw-${kw.id}-${String(index + 1).padStart(2, "0")}`;
      }

      let image = template.photoId
        ? unsplashImage(template.photoId)
        : `/uploads/products/placeholders/${id}.webp`;
      if (!dryRun && !template.photoId) {
        image = await ensureProductPlaceholder(id, template.name);
      }

      const { row, title } = buildProduct({
        keywordId: kw.id,
        categoryId: kw.categoryId,
        template,
        index,
        image,
      });

      toUpsert.push(row);
      existingIds.add(id);
      usedTitles.add(title.toLowerCase());
      existing.push({
        id,
        title,
        description: row.description,
        category: row.category,
      });
      added += 1;
      need -= 1;
    }

    while (need > 0) {
      const n = matched.length + added + 1;
      const template = {
        name: `${kw.searchQuery.charAt(0).toUpperCase() + kw.searchQuery.slice(1)} – Farm Pack ${n}`,
        unit: "each",
      };
      let index = added + 100;
      let id = `fill-kw-${kw.id}-${String(index).padStart(2, "0")}`;
      while (existingIds.has(id)) {
        index += 1;
        id = `fill-kw-${kw.id}-${String(index).padStart(2, "0")}`;
      }

      let image = `/uploads/products/placeholders/${id}.webp`;
      if (!dryRun) {
        image = await ensureProductPlaceholder(id, template.name);
      }

      const { row, title } = buildProduct({
        keywordId: kw.id,
        categoryId: kw.categoryId,
        template,
        index,
        image,
      });

      toUpsert.push(row);
      existingIds.add(id);
      usedTitles.add(title.toLowerCase());
      existing.push({ id, title, description: row.description, category: row.category });
      added += 1;
      need -= 1;
    }

    summary.push({ id: kw.id, had: matched.length, added });
  }

  if (dryRun) {
    console.log(`[dry-run] Would add ${toUpsert.length} products (target ${min} per keyword):\n`);
    for (const s of summary) {
      console.log(
        `  ${s.id.padEnd(12)} ${String(s.had).padStart(3)} → ${String(s.had + s.added).padStart(3)}  (+${s.added})`
      );
    }
    return;
  }

  const BATCH = 40;
  let upserted = 0;
  for (let i = 0; i < toUpsert.length; i += BATCH) {
    const chunk = toUpsert.slice(i, i + BATCH);
    const { error } = await db.from("products").upsert(chunk, { onConflict: "id" });
    if (error) {
      console.error("Upsert failed:", error.message);
      process.exit(1);
    }
    upserted += chunk.length;
  }

  console.log(`\nKeyword fill complete: ${upserted} products added (target: ${min} per keyword).\n`);
  for (const s of summary) {
    const tag = s.added > 0 ? `+${s.added}` : "ok";
    console.log(
      `  ${s.id.padEnd(12)} ${String(s.had).padStart(3)} → ${String(s.had + s.added).padStart(3)}  (${tag})`
    );
  }
  console.log(
    "\nPlaceholder images: server/uploads/products/placeholders/fill-kw-{keyword}-{nn}.webp"
  );
  console.log("Replace images in admin — search will show up to 20+ matching products per term.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
