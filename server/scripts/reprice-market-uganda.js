/**
 * Reprice catalogue listings to competitive Kampala market levels.
 *
 *   fresh      — generated "– One Source" listings + legacy UK seed rows (ids 1–24),
 *                from the reference table in lib/ugandanFreshPrices.js.
 *                Admin-entered listings (UUID ids) are left alone unless --include-admin.
 *   cosmetics  — Boots / Lookfantastic / Cult Beauty listings, from the UK price
 *                via lib/cosmeticsPrices.js.
 *   kitchen    — kitchen ware cut by KITCHEN_UNDERCUT; small appliances moved
 *                from US price × 1.1 to US price.
 *
 * Usage:
 *   cd server && node scripts/reprice-market-uganda.js --dry-run
 *   cd server && node scripts/reprice-market-uganda.js --shop fresh
 *   cd server && node scripts/reprice-market-uganda.js
 *
 * Every write saves the previous prices to ~/onesource-price-backups/.
 * Lookfantastic / Cult Beauty have no stored GBP, so their UK price is derived
 * from the oldest backup (or the pre-2026-10 rate of USh 7,050 per £1 on first run).
 */
import fs from "fs/promises";
import os from "os";
import path from "path";
import { requireSupabase } from "../lib/supabase.js";
import { gbpToUgandanCosmeticsPrice } from "../lib/cosmeticsPrices.js";
import { KITCHEN_UNDERCUT, roundUgx } from "../lib/ugandanKitchenPrices.js";
import {
  FRESH_ONLINE_MARKUP,
  freshMarketPrice,
  freshQualityFactor,
} from "../lib/ugandanFreshPrices.js";

const dryRun = process.argv.includes("--dry-run");
const shopArg = flagValue("--shop") || "all";
const includeAdmin = process.argv.includes("--include-admin");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BACKUP_DIR = path.join(os.homedir(), "onesource-price-backups");
const BOOTS_JSON =
  process.env.BOOTS_CATALOG?.trim() || "/Users/user/Desktop/boots-luxury-skincare/products.json";
const LEGACY_UGX_PER_GBP = 4700 * 1.5;
const LEGACY_APPLIANCE_MARKUP = 1.1;
const LEGACY_SEED_IDS = new Set(Array.from({ length: 24 }, (_, i) => String(i + 1)));

function flagValue(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1] ?? null;
}

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function roundShelf(n) {
  if (n < 1000) return Math.max(200, Math.round(n / 100) * 100);
  if (n < 20000) return Math.round(n / 500) * 500;
  return Math.round(n / 1000) * 1000;
}

async function loadProducts(db) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("products")
      .select("id,title,price,original_price,unit")
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

async function oldestBackupPrices() {
  try {
    const files = (await fs.readdir(BACKUP_DIR)).filter((f) => f.endsWith(".json")).sort();
    const map = new Map();
    for (const f of files.reverse()) {
      const rows = JSON.parse(await fs.readFile(path.join(BACKUP_DIR, f), "utf8"));
      for (const r of rows) map.set(r.id, r.price);
    }
    return map;
  } catch {
    return new Map();
  }
}

function isFreshListing(row) {
  if (row.id.startsWith("kitchen-") || row.id.startsWith("cosmetics-")) return false;
  if (includeAdmin && UUID_RE.test(row.id)) return true;
  return / – One Source/.test(row.title) || LEGACY_SEED_IDS.has(row.id);
}

/** Admin units often say "each" for a pack or bag; read the real quantity from the title. */
function adminUnit({ title, unit }) {
  const u = String(unit || "").trim();
  if (!/^each$/i.test(u)) return u;
  const n = title.match(/(\d+)\s*pack/i);
  if (n) return `${n[1]} pack`;
  if (/family pa(ck|rk)/i.test(title)) return /melon|pineapple/i.test(title) ? "2 pack" : "2kg";
  if (/juice|julice|jiuce|oil|dried|processed|fillet|pieces/i.test(title)) return u;
  if (/[a-z]s$/i.test(title.trim())) return "1kg";
  return u;
}

function planFresh(rows) {
  const changes = [];
  const unmatched = [];
  for (const row of rows.filter(isFreshListing)) {
    const admin = UUID_RE.test(row.id);
    const unit = admin ? adminUnit(row) : row.unit;
    const market = freshMarketPrice({ title: row.title, unit });
    if (market == null) {
      unmatched.push(row);
      continue;
    }
    const jitter = 0.97 + (hashStr(row.id) % 7) / 100;
    let price = roundShelf(market * FRESH_ONLINE_MARKUP * freshQualityFactor(row.title, unit) * jitter);
    if (admin) price = Math.min(price, row.price);
    changes.push({ row, price });
  }
  return { changes, unmatched };
}

async function planCosmetics(rows) {
  const raw = JSON.parse(await fs.readFile(BOOTS_JSON, "utf8"));
  const boots = Array.isArray(raw) ? raw : raw.products ?? [];
  const bootsGbp = new Map(
    boots.map((p) => [String(p.id).replace(/[^a-z0-9]/gi, ""), Number(p.priceValue)])
  );
  const original = await oldestBackupPrices();
  const changes = [];
  const unmatched = [];

  for (const row of rows) {
    const m = row.id.match(/^cosmetics-.+-(boots|lf|cb)-(.+)$/);
    if (!m) continue;
    let gbp = null;
    if (m[1] === "boots") gbp = bootsGbp.get(m[2]) ?? null;
    if (gbp == null) gbp = (original.get(row.id) ?? row.price) / LEGACY_UGX_PER_GBP;
    const price = gbpToUgandanCosmeticsPrice(gbp);
    if (!price) {
      unmatched.push(row);
      continue;
    }
    changes.push({ row, price });
  }
  return { changes, unmatched };
}

/** Prices come from the pre-cut price (oldest backup) so re-runs don't compound. */
async function planKitchen(rows) {
  const original = await oldestBackupPrices();
  const changes = [];
  for (const row of rows) {
    if (!row.id.startsWith("kitchen-")) continue;
    const base = original.get(row.id) ?? row.price;
    const price = row.id.startsWith("kitchen-small-appliances-")
      ? roundUgx(base / LEGACY_APPLIANCE_MARKUP)
      : roundUgx(base * KITCHEN_UNDERCUT);
    changes.push({ row, price });
  }
  return { changes, unmatched: [] };
}

function scaledOriginal(row, price) {
  if (!row.original_price || row.original_price <= row.price) return null;
  const scaled = roundShelf((row.original_price / row.price) * price);
  return scaled > price ? scaled : null;
}

function summarize(label, { changes, unmatched }) {
  const moved = changes.filter((c) => c.price !== c.row.price);
  const before = changes.reduce((s, c) => s + c.row.price, 0);
  const after = changes.reduce((s, c) => s + c.price, 0);
  console.log(
    `\n${label}: ${changes.length} priced, ${moved.length} changed, ${unmatched.length} unmatched` +
      (before ? ` | basket ${Math.round((after / before - 1) * 100)}%` : "")
  );
  const sorted = [...moved].sort((a, b) => hashStr(a.row.id) - hashStr(b.row.id));
  const sample = process.argv.includes("--verbose") ? sorted : sorted.slice(0, 14);
  for (const c of sample) {
    console.log(
      `  ${String(c.row.price).padStart(9)} → ${String(c.price).padStart(9)}  ${(c.row.unit || "").padEnd(12)} ${c.row.title.slice(0, 64)}`
    );
  }
  for (const r of unmatched.slice(0, 20)) console.log(`  ? unmatched: ${r.title} (${r.unit})`);
}

async function main() {
  const db = requireSupabase();
  const rows = await loadProducts(db);
  const plans = [];
  if (shopArg === "all" || shopArg === "fresh") plans.push(["Fresh", planFresh(rows)]);
  if (shopArg === "all" || shopArg === "cosmetics") plans.push(["Cosmetics", await planCosmetics(rows)]);
  if (shopArg === "all" || shopArg === "kitchen") plans.push(["Kitchen", await planKitchen(rows)]);

  for (const [label, plan] of plans) summarize(label, plan);
  if (dryRun) return;

  const changes = plans.flatMap(([, plan]) => plan.changes).filter((c) => c.price !== c.row.price);
  if (!changes.length) {
    console.log("\nNothing to update.");
    return;
  }

  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const backupFile = path.join(BACKUP_DIR, `prices-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await fs.writeFile(
    backupFile,
    JSON.stringify(changes.map(({ row }) => ({ id: row.id, price: row.price, original_price: row.original_price })))
  );
  console.log(`\nBackup: ${backupFile}`);

  let done = 0;
  const queue = [...changes];
  async function worker() {
    while (queue.length) {
      const { row, price } = queue.shift();
      const { error } = await db
        .from("products")
        .update({ price, original_price: scaledOriginal(row, price) })
        .eq("id", row.id);
      if (error) throw new Error(`${row.id}: ${error.message}`);
      done += 1;
      if (done % 250 === 0 || done === changes.length) console.log(`  updated ${done}/${changes.length}`);
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  console.log("Done.");
}

main().catch((err) => {
  console.error("Reprice failed:", err.message);
  process.exit(1);
});
