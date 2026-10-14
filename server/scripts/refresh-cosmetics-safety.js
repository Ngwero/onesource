/**
 * Re-derives safety warnings / storage for Cosmetics rows that aren't skincare:
 * candles, home fragrance, supplements, sexual wellness, textiles and electrical
 * appliances (adds "UK plug, 220–240 V"). Skincare boilerplate (patch test, avoid eyes…)
 * is dropped for these kinds; any other existing warning is kept.
 *
 * Usage:
 *   cd server && node scripts/refresh-cosmetics-safety.js --dry-run
 *   cd server && node scripts/refresh-cosmetics-safety.js
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { requireSupabase } from "../lib/supabase.js";
import { COSMETICS_WARNINGS as W, ELECTRICAL, cosmeticsKind, cosmeticsProductDetails } from "../lib/cosmeticsProductInfo.js";

const dryRun = process.argv.includes("--dry-run");
const KINDS = new Set(["supplement", "intimate", "candle", "homeScent", "textile"]);
/** Warnings derived from the title alone; recomputed rather than carried over. */
const TITLE_DERIVED = new Set([
  W.external, W.eyes, W.irritation, W.patch, W.flammable, W.fragrance, W.heatedTool, W.ukPlug, W.electrical,
  W.candle, W.candleWick, W.homeScent, W.homeScentFlammable, W.supplementDose, W.supplementDiet,
  W.supplementAdvice, W.supplementAllergens, W.intimate, W.intimateStop, W.intimateCompat, W.deviceClean,
]);
const stripSuffix = (title) => String(title || "").replace(/\s+[–-]\s+One Source$/, "");

async function fetchAll(db) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("products").select("id,title,details").like("id", "cosmetics-%").order("id").range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

async function main() {
  const db = requireSupabase();
  const rows = await fetchAll(db);
  const updates = [];
  for (const row of rows) {
    const title = stripSuffix(row.title);
    const kind = cosmeticsKind(title);
    const hadPlug = (row.details?.warnings ?? []).includes(W.ukPlug);
    if (!KINDS.has(kind) && !KINDS.has(row.details?.form) && !ELECTRICAL.test(title) && !hadPlug) continue;
    const fresh = cosmeticsProductDetails({ title, brand: row.details?.brand }).details;
    const kept = (row.details?.warnings ?? []).filter((w) => !TITLE_DERIVED.has(w) && !fresh.warnings?.includes(w));
    const warnings = [...(fresh.warnings ?? []), ...kept];
    const details = { ...(row.details ?? {}), form: fresh.form, warnings };
    if (fresh.storage) details.storage = fresh.storage;
    else delete details.storage;
    if (JSON.stringify(details) !== JSON.stringify(row.details ?? {})) updates.push({ id: row.id, title, kind, before: row.details, details });
  }
  const byKind = {};
  for (const u of updates) byKind[u.kind] = (byKind[u.kind] ?? 0) + 1;
  console.log(`Cosmetics rows: ${rows.length} | to update: ${updates.length}`, byKind);
  for (const u of updates.filter((_, i) => i % 40 === 0).slice(0, 12)) console.log(`  ${u.kind.padEnd(10)} ${u.title}`);
  if (dryRun || !updates.length) return;

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(os.homedir(), "onesource-details", "backups", `cosmetics-safety-refresh-${stamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(updates.map(({ id, before }) => ({ id, details: before })), null, 1));
  console.log(`Backup → ${backupFile}`);

  let errors = 0;
  for (let i = 0; i < updates.length; i += 8) {
    await Promise.all(
      updates.slice(i, i + 8).map(async (u) => {
        const { error } = await db.from("products").update({ details: u.details }).eq("id", u.id);
        if (error) {
          errors += 1;
          console.error(`  ✗ ${u.id}: ${error.message}`);
        }
      })
    );
  }
  console.log(`Done. updated: ${updates.length - errors} | errors: ${errors}`);
  if (errors) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Safety refresh failed:", err.message);
  process.exit(1);
});
