/**
 * Moves products out of the old catch-all "hair-baby-more" Cosmetics aisle into
 * fragrance / hair-care / mens (and any better-fitting aisle) by re-iding them:
 *   cosmetics-hair-baby-more-lf-123 → cosmetics-fragrance-lf-123
 * Nails, baby and oral care stay in "hair-baby-more" ("Nails, baby & more").
 *
 * Old ids keep resolving: GET /api/products/:id falls back to the same source id in
 * another aisle. Full rows + the id map are backed up before any write.
 *
 * Usage:
 *   cd server && node scripts/split-cosmetics-aisles.js --dry-run
 *   cd server && node scripts/split-cosmetics-aisles.js
 *   cd server && node scripts/split-cosmetics-aisles.js --non-core   (candles, supplements… from any aisle)
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { requireSupabase } from "../lib/supabase.js";
import { classifyCosmetic } from "../lib/cosmeticsClassify.js";
import { productIdWithoutAisle } from "../lib/aisles.js";

const FROM_AISLE = "hair-baby-more";
const dryRun = process.argv.includes("--dry-run");
/** --non-core: scan every cosmetics aisle, only moving rows into the non-cosmetics aisles. */
const nonCore = process.argv.includes("--non-core");
const NON_CORE_AISLES = new Set(["home-fragrance", "wellness", "sexual-wellness", "beauty-tech-home"]);
const PREFIX = nonCore ? "cosmetics-" : `cosmetics-${FROM_AISLE}-`;
const CONCURRENCY = 8;

const stripSuffix = (title) => String(title || "").replace(/\s+[–-]\s+One Source$/, "");

async function fetchAll(db) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("products").select("*").like("id", `${PREFIX}%`).order("id").range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

async function withRetries(fn, label, attempts = 5) {
  for (let i = 1; ; i += 1) {
    try {
      return await fn();
    } catch (err) {
      if (i >= attempts) throw err;
      console.warn(`  retry ${i}/${attempts} ${label}: ${err.message}`);
      await new Promise((r) => setTimeout(r, Math.min(8000, 500 * 2 ** (i - 1))));
    }
  }
}

async function main() {
  const db = requireSupabase();
  const rows = await fetchAll(db);
  const moves = [];
  for (const row of rows) {
    const c = classifyCosmetic(stripSuffix(row.title));
    const current = row.id.slice("cosmetics-".length, row.id.length - productIdWithoutAisle("cosmetics", row.id).length - 1);
    if (!c.aisle || c.aisle === current) continue;
    if (nonCore ? !NON_CORE_AISLES.has(c.aisle) : c.aisle === FROM_AISLE) continue;
    const to = `cosmetics-${c.aisle}-${productIdWithoutAisle("cosmetics", row.id)}`;
    moves.push({ from: row.id, to, aisle: c.aisle, title: row.title });
  }

  const targets = moves.map((m) => m.to);
  const taken = new Set();
  for (let i = 0; i < targets.length; i += 200) {
    const { data, error } = await db.from("products").select("id").in("id", targets.slice(i, i + 200));
    if (error) throw error;
    for (const r of data) taken.add(r.id);
  }
  const clashes = moves.filter((m) => taken.has(m.to));
  const todo = moves.filter((m) => !taken.has(m.to));

  const byAisle = {};
  for (const m of todo) byAisle[m.aisle] = (byAisle[m.aisle] ?? 0) + 1;
  console.log(`Rows scanned (${nonCore ? "all cosmetics, non-core targets" : FROM_AISLE}): ${rows.length} | moving: ${todo.length} | staying: ${rows.length - moves.length} | id clashes (left in place): ${clashes.length}`);
  for (const [a, n] of Object.entries(byAisle).sort((x, y) => y[1] - x[1])) console.log(`  • ${a}: ${n}`);

  if (dryRun) {
    fs.writeFileSync("/tmp/cosmetics-aisle-split-plan.json", JSON.stringify({ moves: todo, clashes }, null, 1));
    console.log("Plan → /tmp/cosmetics-aisle-split-plan.json");
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(os.homedir(), "onesource-details", "backups", `cosmetics-aisle-split${nonCore ? "-non-core" : ""}-${stamp}.json`);
  fs.mkdirSync(path.dirname(backupFile), { recursive: true });
  const moving = new Set(todo.map((m) => m.from));
  fs.writeFileSync(
    backupFile,
    JSON.stringify({ createdAt: stamp, map: Object.fromEntries(todo.map((m) => [m.from, m.to])), rows: rows.filter((r) => moving.has(r.id)) }, null, 1)
  );
  console.log(`Backup → ${backupFile}`);

  let index = 0;
  let done = 0;
  const errors = [];
  async function worker() {
    while (index < todo.length) {
      const m = todo[index++];
      try {
        await withRetries(async () => {
          const { error } = await db.from("products").update({ id: m.to }).eq("id", m.from);
          if (error) throw error;
        }, m.from);
      } catch (err) {
        errors.push(m.from);
        console.error(`  ✗ ${m.from}: ${err.message}`);
      }
      done += 1;
      if (done % 500 === 0 || done === todo.length) console.log(`  … ${done}/${todo.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`Done. moved: ${todo.length - errors.length} | errors: ${errors.length}`);
  if (errors.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Aisle split failed:", err.message);
  process.exit(1);
});
