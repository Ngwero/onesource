/**
 * Store the real Lookfantastic customer ratings (products.json `rating` + `review_count`)
 * on the matching Cosmetics rows (cosmetics-{aisle}-lf-{productId}) and mark them with
 * details.ratingSource = "lookfantastic". Product cards only show filled stars for rows
 * carrying a ratingSource; everything else shows "No reviews yet".
 *
 * Only rating, review_count and details are written. A backup of the previous values is
 * saved to ~/onesource-details/backups/ before any write.
 *
 * Usage:
 *   cd server && node scripts/store-lookfantastic-ratings.js --dry-run
 *   cd server && node scripts/store-lookfantastic-ratings.js
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { requireSupabase } from "../lib/supabase.js";

const ROOT = process.env.LF_FOLDER?.trim() || "/Users/user/lookfantastic-products/all-products";
const SOURCE = "lookfantastic";
const CONCURRENCY = 12;
const dryRun = process.argv.includes("--dry-run");

function loadSourceRatings() {
  const products = JSON.parse(fs.readFileSync(path.join(ROOT, "products.json"), "utf8"));
  const byId = new Map();
  const bySku = new Map();
  for (const p of Array.isArray(products) ? products : Object.values(products)) {
    const rating = Number(p.rating);
    const count = Number(p.review_count);
    if (!(rating > 0) || !(count > 0)) continue;
    const value = { rating: Number(Math.min(5, rating).toFixed(1)), count: Math.round(count) };
    byId.set(String(p.id), value);
    for (const v of p.variants ?? []) if (v?.sku && !bySku.has(String(v.sku))) bySku.set(String(v.sku), value);
  }
  return { get: (id) => byId.get(id) ?? bySku.get(id) };
}

async function fetchLfRows(db) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("products")
      .select("id,rating,review_count,details")
      .like("id", "cosmetics-%-lf-%")
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

async function main() {
  const db = requireSupabase();
  const ratings = loadSourceRatings();
  const rows = await fetchLfRows(db);

  const updates = [];
  let noSource = 0;
  for (const row of rows) {
    const sourceId = row.id.match(/-lf-(\d+)$/)?.[1];
    const real = sourceId ? ratings.get(sourceId) : null;
    if (!real) {
      noSource += 1;
      continue;
    }
    if (
      Number(row.rating) === real.rating &&
      row.review_count === real.count &&
      row.details?.ratingSource === SOURCE
    ) {
      continue;
    }
    updates.push({ row, real });
  }

  console.log(
    `LF rows: ${rows.length} | with a real source rating: ${rows.length - noSource} | to update: ${updates.length} | no source rating: ${noSource}`
  );
  for (const { row, real } of updates.slice(0, 8)) {
    console.log(`  ${row.id}  ${row.rating}/${row.review_count} → ${real.rating}/${real.count}`);
  }
  if (dryRun || !updates.length) return;

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(os.homedir(), "onesource-details", "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `lf-ratings-${stamp}.json`);
  fs.writeFileSync(
    backupFile,
    JSON.stringify(
      updates.map(({ row }) => ({ id: row.id, rating: row.rating, review_count: row.review_count, details: row.details })),
      null,
      1
    )
  );
  console.log(`Backup → ${backupFile}`);

  let written = 0;
  let errors = 0;
  for (let i = 0; i < updates.length; i += CONCURRENCY) {
    await Promise.all(
      updates.slice(i, i + CONCURRENCY).map(async ({ row, real }) => {
        // Re-read details right before writing so concurrent details edits aren't lost.
        const { data: current, error: readError } = await db
          .from("products")
          .select("details")
          .eq("id", row.id)
          .maybeSingle();
        if (readError || !current) {
          errors += 1;
          console.error(`  ✗ ${row.id}: ${readError?.message ?? "missing"}`);
          return;
        }
        const { error } = await db
          .from("products")
          .update({
            rating: real.rating,
            review_count: real.count,
            details: { ...(current.details ?? {}), ratingSource: SOURCE },
          })
          .eq("id", row.id);
        if (error) {
          errors += 1;
          console.error(`  ✗ ${row.id}: ${error.message}`);
        } else {
          written += 1;
        }
      })
    );
    if ((i / CONCURRENCY) % 100 === 0) console.log(`  ${written}/${updates.length}`);
  }
  console.log(`Done. updated: ${written} | errors: ${errors}`);
  if (errors) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Storing Lookfantastic ratings failed:", err.message);
  process.exit(1);
});
