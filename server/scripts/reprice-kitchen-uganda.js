/**
 * Reprice all kitchen-ware SKUs to Ugandan (Kampala) retail bands.
 *
 *   cd server && npm run reprice:kitchen-uganda
 *   cd server && npm run reprice:kitchen-uganda -- --dry-run
 */
import { requireSupabase } from "../lib/supabase.js";
import { ugandanKitchenPrice } from "../lib/ugandanKitchenPrices.js";
import { KITCHEN_WARE_CATEGORY_ID } from "../data/kitchenWareCatalog.js";

const dryRun = process.argv.includes("--dry-run");
const PAGE = 1000;
const CHUNK = 80;

async function fetchKitchenRows(db) {
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await db
      .from("products")
      .select("*")
      .or(`category.eq.${KITCHEN_WARE_CATEGORY_ID},id.like.kitchen-%`)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

function nextOriginal(row, price) {
  const oldPrice = Number(row.price) || 0;
  const oldOriginal =
    row.original_price != null ? Number(row.original_price) : null;
  if (oldOriginal && oldPrice > 0 && oldOriginal > oldPrice) {
    return roundKeepSale(price, oldOriginal / oldPrice);
  }
  return null;
}

function roundKeepSale(price, ratio) {
  const next = Math.round((price * ratio) / 1000) * 1000;
  return Math.max(price + 1000, next);
}

async function main() {
  const db = requireSupabase();
  const rows = await fetchKitchenRows(db);
  const seen = new Set();
  const unique = rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });

  const updates = unique.map((row) => {
    const price = ugandanKitchenPrice({
      id: row.id,
      title: row.title,
    });
    return {
      ...row,
      oldPrice: Number(row.price) || 0,
      title: row.title,
      price,
      original_price: nextOriginal(row, price),
    };
  });

  const olds = updates.map((u) => u.oldPrice);
  const news = updates.map((u) => u.price);
  const avg = (arr) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  const sorted = [...news].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  console.log(
    `Kitchen SKUs: ${updates.length}` +
      `\n  was  min ${Math.min(...olds).toLocaleString()}  median ${[...olds]
        .sort((a, b) => a - b)
        [Math.floor(olds.length / 2)].toLocaleString()}  max ${Math.max(
        ...olds
      ).toLocaleString()}  avg ${avg(olds).toLocaleString()}` +
      `\n  now  min ${Math.min(...news).toLocaleString()}  median ${median.toLocaleString()}  max ${Math.max(
        ...news
      ).toLocaleString()}  avg ${avg(news).toLocaleString()}`
  );

  console.log("\nSample:");
  for (const row of updates.slice(0, 8)) {
    console.log(
      `  ${row.oldPrice.toLocaleString()} → ${row.price.toLocaleString()}  ${row.title.slice(0, 64)}`
    );
  }

  if (dryRun) {
    console.log("\nDry run — no database writes.");
    return;
  }

  let written = 0;
  for (let i = 0; i < updates.length; i += CHUNK) {
    const chunk = updates.slice(i, i + CHUNK).map(({ oldPrice, ...row }) => row);
    const { error } = await db.from("products").upsert(chunk, {
      onConflict: "id",
    });
    if (error) throw error;
    written += chunk.length;
    if (written % 800 === 0 || written === updates.length) {
      console.log(`  updated ${written}/${updates.length}`);
    }
  }

  console.log(`\nDone. ${written} kitchen products now use Ugandan shelf prices.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
