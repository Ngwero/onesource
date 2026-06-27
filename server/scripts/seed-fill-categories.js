/**
 * Ensure every category has at least 12 products in Supabase.
 * New rows use local placeholder WebP images — replace via admin upload.
 *
 * Usage:
 *   cd server && npm run seed:fill-categories
 *   cd server && npm run seed:fill-categories -- --min=12
 *   cd server && npm run seed:fill-categories -- --dry-run
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson, normalizeCategoryId } from "../db.js";
import {
  getAllCategoryTargets,
  MIN_PRODUCTS_PER_CATEGORY,
} from "../data/categoryFillCatalog.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";

function parseArgs() {
  const minArg = process.argv.find((a) => a.startsWith("--min="));
  const min = minArg ? Number(minArg.split("=")[1]) : MIN_PRODUCTS_PER_CATEGORY;
  return {
    min: Number.isFinite(min) && min > 0 ? min : MIN_PRODUCTS_PER_CATEGORY,
    dryRun: process.argv.includes("--dry-run"),
  };
}

function randomPrice(base = 5000) {
  return Math.round((base + Math.floor(Math.random() * 40000)) / 100) * 100;
}

async function fetchAllProducts(db) {
  const all = [];
  const pageSize = 500;
  let from = 0;
  while (true) {
    const { data, error } = await db
      .from("products")
      .select("id, title, category")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

function buildFillProduct({ categoryId, template, index, image }) {
  const slug = String(index + 1).padStart(2, "0");
  const id = `fill-${categoryId}-${slug}`;
  const price = randomPrice(3000 + index * 800);
  const hasDeal = index % 4 === 0;

  return {
    id,
    title: `${template.name} – One Source`,
    price,
    originalPrice: hasDeal ? Math.round(price * 1.2) : undefined,
    rating: Number((4 + Math.random() * 0.85).toFixed(1)),
    reviewCount: Math.floor(50 + Math.random() * 3000),
    image,
    category: categoryId,
    unit: template.unit ?? "each",
    prime: Math.random() > 0.35,
    description: `${template.name}. Farm-sourced in Uganda. Upload a product photo in admin to replace the placeholder image.`,
    inStock: true,
    stockQuantity: 40 + Math.floor(Math.random() * 120),
    delivery: "FREE same-day delivery on orders over USh 100,000",
  };
}

async function main() {
  const { min, dryRun } = parseArgs();
  const db = requireSupabase();
  const existing = await fetchAllProducts(db);

  const byCategory = new Map();
  const existingIds = new Set();

  for (const row of existing) {
    existingIds.add(row.id);
    const cat = normalizeCategoryId(row.category);
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(row);
  }

  const targets = getAllCategoryTargets();
  const toUpsert = [];
  const summary = [];

  for (const { id: categoryId, name: categoryName, templates } of targets) {
    const inCat = byCategory.get(categoryId) ?? [];
    const need = Math.max(0, min - inCat.length);

    if (need === 0) {
      summary.push({ categoryId, had: inCat.length, added: 0 });
      continue;
    }

    const usedTitles = new Set(inCat.map((p) => p.title.toLowerCase()));
    let added = 0;

    for (let i = 0; i < templates.length && added < need; i++) {
      const template = templates[i];
      const probeTitle = `${template.name} – One Source`;
      if (usedTitles.has(probeTitle.toLowerCase())) continue;

      let index = i;
      let id = `fill-${categoryId}-${String(index + 1).padStart(2, "0")}`;
      while (existingIds.has(id)) {
        index += 1;
        id = `fill-${categoryId}-${String(index + 1).padStart(2, "0")}`;
      }

      const product = buildFillProduct({
        categoryId,
        template,
        index,
        image: "", // set after placeholder
      });
      product.id = id;

      if (!dryRun) {
        product.image = await ensureProductPlaceholder(id, template.name);
      } else {
        product.image = `/uploads/products/placeholders/${id}.webp`;
      }

      toUpsert.push(seedRowFromJson(product));
      existingIds.add(id);
      usedTitles.add(probeTitle.toLowerCase());
      added += 1;
    }

    if (added < need) {
      for (let j = 0; j < need - added; j++) {
        const index = templates.length + j;
        const template = {
          name: `${categoryName} – Item ${inCat.length + added + j + 1}`,
          unit: "each",
        };
        let id = `fill-${categoryId}-${String(index + 1).padStart(2, "0")}`;
        while (existingIds.has(id)) {
          id = `fill-${categoryId}-${String(index + 1 + Math.random() * 99).padStart(2, "0")}`;
        }
        const product = buildFillProduct({ categoryId, template, index, image: "" });
        product.id = id;
        if (!dryRun) {
          product.image = await ensureProductPlaceholder(id, template.name);
        } else {
          product.image = `/uploads/products/placeholders/${id}.webp`;
        }
        toUpsert.push(seedRowFromJson(product));
        existingIds.add(id);
        added += 1;
      }
    }

    summary.push({ categoryId, had: inCat.length, added });
  }

  if (dryRun) {
    console.log(`[dry-run] Would upsert ${toUpsert.length} products:\n`);
    for (const s of summary) {
      if (s.added > 0) {
        console.log(`  ${s.categoryId}: ${s.had} → ${s.had + s.added} (+${s.added})`);
      }
    }
    return;
  }

  const BATCH = 40;
  let upserted = 0;
  for (let i = 0; i < toUpsert.length; i += BATCH) {
    const chunk = toUpsert.slice(i, i + BATCH);
    const { error } = await db.from("products").upsert(chunk, { onConflict: "id" });
    if (error) {
      console.error("Fill seed failed:", error.message);
      process.exit(1);
    }
    upserted += chunk.length;
  }

  console.log(`\nFill complete: ${upserted} products added (target: ${min} per category).\n`);
  for (const s of summary) {
    const status = s.added > 0 ? `+${s.added}` : "ok";
    console.log(`  ${s.categoryId.padEnd(36)} ${String(s.had).padStart(3)} → ${String(s.had + s.added).padStart(3)}  (${status})`);
  }
  console.log(
    "\nPlaceholder images: server/uploads/products/placeholders/fill-{category}-{nn}.webp"
  );
  console.log("Replace images in admin — paste URL or upload; product title & price are ready.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
