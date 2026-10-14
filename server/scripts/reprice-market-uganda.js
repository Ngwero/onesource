/**
 * Reprice catalogue listings to competitive Kampala market levels.
 *
 *   fresh      — generated "– One Source" listings + legacy UK seed rows (ids 1–24),
 *                from the reference table in lib/ugandanFreshPrices.js.
 *                Admin-entered listings (UUID ids) are left alone unless --include-admin.
 *   cosmetics  — Lookfantastic / Cult Beauty / Boots listings, from the supplier's
 *                GBP price via cosmeticsShelfPrice() in lib/cosmeticsPrices.js.
 *                Other cosmetics (Clabane, bundles) are left alone.
 *   kitchen    — Cookwarestore / Everything Kitchens / Made In listings, from the
 *                supplier price via kitchenShelfPrice() in lib/ugandanKitchenPrices.js.
 *                Listings without a supplier price keep their price.
 *
 * Kitchen and cosmetics prices only go down (pass --allow-raise to also raise), and a
 * cut never goes below landed cost × 1.05. Was-prices are kept only where the supplier
 * showed a real crossed-out price; made-up ones are cleared.
 *
 * Usage:
 *   cd server && node scripts/reprice-market-uganda.js --shop kitchen --dry-run
 *   cd server && node scripts/reprice-market-uganda.js --shop cosmetics --limit 200
 *   cd server && node scripts/reprice-market-uganda.js --shop cosmetics
 *   cd server && node scripts/reprice-market-uganda.js --audit
 *
 * Flags: --shop fresh|kitchen|cosmetics|all, --dry-run, --limit N (rows to write),
 * --concurrency N (default 8), --allow-raise, --include-admin, --audit, --verbose.
 * Dry runs write the plan to /tmp/reprice-plan-<shop>.json. Every write first saves
 * id/price/original_price of the whole shop to ~/onesource-details/backups/.
 */
import fs from "fs/promises";
import os from "os";
import path from "path";
import { requireSupabase } from "../lib/supabase.js";
import {
  cosmeticsShelfPrice,
  cosmeticsWasPrice,
  roundCosmeticsUgx,
} from "../lib/cosmeticsPrices.js";
import {
  aisleIdFromKitchenProductId,
  kitchenShelfPrice,
  kitchenWasPrice,
} from "../lib/ugandanKitchenPrices.js";
import {
  loadCookwarestorePrices,
  loadCosmeticsPrices,
  loadEverythingKitchensPrices,
  loadMadeInPrices,
  sourcePriceFor,
} from "../lib/sourcePrices.js";
import {
  FRESH_ONLINE_MARKUP,
  freshMarketPrice,
  freshQualityFactor,
} from "../lib/ugandanFreshPrices.js";

const dryRun = process.argv.includes("--dry-run");
const auditOnly = process.argv.includes("--audit");
const allowRaise = process.argv.includes("--allow-raise");
const verbose = process.argv.includes("--verbose");
const shopArg = flagValue("--shop") || "all";
const limitArg = Number(flagValue("--limit") || 0);
const CONCURRENCY = Math.max(1, Number(flagValue("--concurrency") || 8));
const includeAdmin = process.argv.includes("--include-admin");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BACKUP_DIR = path.join(os.homedir(), "onesource-details", "backups");
const BENCHMARKS = new URL("../data/uganda-price-benchmarks.json", import.meta.url);
const UGX_PER_USD = 3700;
const LEGACY_SEED_IDS = new Set(Array.from({ length: 24 }, (_, i) => String(i + 1)));

const COSMETICS_AISLES = [
  "fragrance", "hair-care", "mens", "home-fragrance", "wellness", "beauty-tech-home",
  "sexual-wellness", "face-makeup", "eye-makeup", "lips", "face-eye-care", "serums-oils",
  "cleansers-bars", "sun-protection", "acne-care", "body-care", "hair-baby-more",
  "kits-bundles", "brushes-tools",
].sort((a, b) => b.length - a.length);

/** Typical items for the before/after table, matched on title; `category` keys the benchmark file. */
const REFERENCE_ITEMS = {
  kitchen: [
    { label: "Frying pan", category: "frying-pan", re: /frying pan|frypan|skillet/i },
    { label: "Saucepan / cookware set", category: "saucepan-set", re: /saucepan set|pan set|cookware set|pot set/i },
    { label: "Chef's knife", category: "knife-set", re: /chef'?s knife|cook'?s knife/i },
    { label: "Mug", category: "mug", re: /\bmug\b/i },
    { label: "Plate / dinner set", category: "plate-dinner-set", re: /plate set|dinner set|dinnerware set|set of \d+ plates/i },
    { label: "Cutlery set", category: "cutlery-set", re: /cutlery set|flatware set/i },
    { label: "Kettle (electric)", category: "electric-kettle", re: /kettle/i, aisle: "small-appliances" },
    { label: "Kettle (stovetop)", category: "electric-kettle", re: /kettle/i, notAisle: "small-appliances" },
    { label: "Blender", category: "blender", re: /blender(?! jar| lid| blade)/i, aisle: "small-appliances" },
    { label: "Stand mixer", category: "stand-mixer", re: /stand mixer/i, aisle: "small-appliances" },
  ],
  cosmetics: [
    { label: "Lipstick", category: "lipstick", re: /lipstick/i },
    { label: "Foundation", category: "foundation", re: /foundation(?! brush)/i },
    { label: "Mascara", category: "mascara", re: /mascara/i },
    { label: "Moisturiser", category: "moisturiser", re: /moisturi[sz]er/i },
    { label: "Shampoo", category: "shampoo", re: /shampoo/i },
    { label: "Perfume 50ml", category: "perfume-100ml", re: /eau de (parfum|toilette).*\b50 ?ml/i },
    { label: "Perfume 100ml", category: "perfume-100ml", re: /eau de (parfum|toilette).*\b100 ?ml/i },
    { label: "Sunscreen", category: "sunscreen", re: /\bspf\b|sunscreen/i },
    { label: "Body lotion", category: "body-lotion", re: /body lotion/i },
    { label: "Nail polish", category: "nail-polish", re: /nail polish|nail colou?r|nail lacquer/i },
    { label: "Makeup brush", category: "makeup-brush-set", re: /\bbrush(es)?\b/i, aisle: "brushes-tools" },
    { label: "Serum", category: "serum", re: /\bserum\b/i },
  ],
};

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

function quantile(sorted, p) {
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] : null;
}

function dist(values) {
  const a = values.filter((v) => Number.isFinite(v)).sort((x, y) => x - y);
  return {
    n: a.length,
    p25: quantile(a, 0.25),
    median: quantile(a, 0.5),
    p75: quantile(a, 0.75),
    max: a[a.length - 1] ?? null,
    medianUsd: a.length ? Math.round((quantile(a, 0.5) / UGX_PER_USD) * 100) / 100 : null,
  };
}

function shopOf(id) {
  if (id.startsWith("kitchen-")) return "kitchen";
  if (id.startsWith("cosmetics-")) return "cosmetics";
  return "fresh";
}

function aisleOf(id) {
  if (id.startsWith("kitchen-")) return aisleIdFromKitchenProductId(id) ?? "other";
  if (id.startsWith("cosmetics-")) return COSMETICS_AISLES.find((a) => id.startsWith(`cosmetics-${a}-`)) ?? "other";
  return "fresh";
}

function bareTitle(title) {
  return String(title || "").replace(/\s+–\s+One Source\s*$/, "");
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

async function loadProducts(db, shops) {
  const filters = shops.map((shop) =>
    shop === "fresh"
      ? (q) => q.not("id", "like", "kitchen-%").not("id", "like", "cosmetics-%")
      : (q) => q.like("id", `${shop}-%`)
  );
  const rows = [];
  for (const filter of filters) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await withRetries(async () => {
        const res = await filter(db.from("products").select("id,title,price,original_price,unit"))
          .order("id")
          .range(from, from + 999);
        if (res.error) throw res.error;
        return res;
      }, `load ${from}`);
      if (error) throw error;
      rows.push(...data);
      if (data.length < 1000) break;
    }
  }
  return rows;
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

function scaledOriginal(row, price) {
  if (!row.original_price || row.original_price <= row.price) return null;
  const scaled = roundShelf((row.original_price / row.price) * price);
  return scaled > price ? scaled : null;
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
    changes.push({ row, price, original: scaledOriginal(row, price) });
  }
  return { changes, unmatched, notes: [] };
}

/** Was-prices are only kept (and re-derived), never added to listings that had none. */
function hadWas(row) {
  return row.original_price != null && row.original_price > row.price;
}

/** Shared "only down, never below cost" rule; returns the price to set and why. */
function settle(row, model, floor) {
  if (allowRaise) return { price: model, note: model > row.price ? "raised" : null };
  if (model >= row.price) {
    return { price: row.price, note: floor && row.price < floor ? "below-cost-kept" : model > row.price ? "raise-skipped" : null };
  }
  if (floor && model < floor) {
    const price = Math.min(row.price, floor);
    return { price, note: "cut-stopped-at-cost" };
  }
  return { price: model, note: null };
}

async function planKitchen(rows) {
  const maps = {
    cws: loadCookwarestorePrices(),
    ek: loadEverythingKitchensPrices(),
    madein: await loadMadeInPrices(),
  };
  console.log(`Kitchen sources: Cookwarestore ${maps.cws.size}, Everything Kitchens ${maps.ek.size}, Made In ${maps.madein.size}`);
  const changes = [];
  const unmatched = [];
  for (const row of rows) {
    if (!row.id.startsWith("kitchen-")) continue;
    const src = sourcePriceFor(row.id, maps);
    if (!src) {
      unmatched.push(row);
      changes.push({ row, price: row.price, original: null, note: "no-source", tier: null, floor: null });
      continue;
    }
    const r = kitchenShelfPrice({
      id: row.id,
      title: bareTitle(row.title),
      brand: src.brand ?? row.brand,
      gbp: src.gbp,
      usd: src.usd,
    });
    const { price, note } = settle(row, r.price, r.floor);
    changes.push({
      row,
      price,
      model: r.price,
      original: hadWas(row) ? kitchenWasPrice(price, src) : null,
      note: note ?? (r.belowCost ? "band-below-cost" : null),
      tier: r.tier,
      floor: r.floor,
      sourceUgx: src.gbp ? Math.round(src.gbp * 4750) : Math.round(src.usd * UGX_PER_USD),
    });
  }
  return { changes, unmatched };
}

async function planCosmetics(rows) {
  const maps = loadCosmeticsPrices();
  console.log(`Cosmetics sources: Lookfantastic ${maps.lf.size}, Cult Beauty ${maps.cb.size}, Boots ${maps.boots.size}`);
  const changes = [];
  const unmatched = [];
  for (const row of rows) {
    if (!/^cosmetics-.+-(lf|cb|boots)-/.test(row.id)) continue;
    const src = sourcePriceFor(row.id, maps);
    const r = src && cosmeticsShelfPrice(src.gbp, { title: bareTitle(row.title), brand: src.brand ?? row.brand });
    if (!r) {
      unmatched.push(row);
      continue;
    }
    const { price, note } = settle(row, r.price, r.floor);
    let original = null;
    if (hadWas(row) && src.wasGbp) original = cosmeticsWasPrice(price, src.gbp, src.wasGbp);
    else if (hadWas(row)) {
      const was = roundCosmeticsUgx((row.original_price / row.price) * price);
      original = was > price ? was : null;
    }
    changes.push({
      row,
      price,
      model: r.price,
      original,
      note: note ?? (r.ceilingConflict ? "ceiling-below-cost" : null),
      tier: r.tier,
      floor: r.floor,
      category: r.category,
      sourceUgx: Math.round(src.gbp * 4750),
    });
  }
  return { changes, unmatched };
}

function changed(c) {
  return c.price !== c.row.price || (c.original ?? null) !== (c.row.original_price ?? null);
}

async function buildReport(shop, plan, allRows) {
  const benchmarks = JSON.parse(await fs.readFile(BENCHMARKS, "utf8")).benchmarks.filter((b) => b.shop === shop);
  const byId = new Map(plan.changes.map((c) => [c.row.id, c]));
  const shopRows = allRows.filter((r) => shopOf(r.id) === shop);
  const newPrice = (r) => byId.get(r.id)?.price ?? r.price;
  const newWas = (r) => (byId.has(r.id) ? byId.get(r.id).original ?? null : r.original_price ?? null);

  const aisles = {};
  for (const r of shopRows) (aisles[aisleOf(r.id)] ??= []).push(r);
  const perAisle = Object.entries(aisles)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([aisle, list]) => ({
      aisle,
      n: list.length,
      old: dist(list.map((r) => r.price)),
      new: dist(list.map(newPrice)),
    }));

  const reference = (REFERENCE_ITEMS[shop] ?? []).map((ref) => {
    const list = shopRows.filter(
      (r) =>
        ref.re.test(r.title) &&
        (!ref.aisle || aisleOf(r.id) === ref.aisle) &&
        (!ref.notAisle || aisleOf(r.id) !== ref.notAisle)
    );
    const tiers = {};
    for (const r of list) {
      const tier = byId.get(r.id)?.tier ?? "unknown";
      (tiers[tier] ??= []).push(r);
    }
    return {
      label: ref.label,
      n: list.length,
      oldMedian: dist(list.map((r) => r.price)).median,
      newMedian: dist(list.map(newPrice)).median,
      byTier: Object.fromEntries(
        Object.entries(tiers).map(([t, l]) => [t, { n: l.length, oldMedian: dist(l.map((r) => r.price)).median, newMedian: dist(l.map(newPrice)).median }])
      ),
      benchmark: benchmarks
        .filter((b) => b.category === ref.category)
        .map((b) => ({ tier: b.brandTier, ugxLow: b.ugxLow, ugxHigh: b.ugxHigh, examples: b.examples })),
      examples: list
        .filter((_, i) => i % Math.max(1, Math.floor(list.length / 4)) === 0)
        .slice(0, 4)
        .map((r) => ({ id: r.id, title: bareTitle(r.title).slice(0, 80), old: r.price, new: newPrice(r), tier: byId.get(r.id)?.tier })),
    };
  });

  const notes = {};
  for (const c of plan.changes) if (c.note) notes[c.note] = (notes[c.note] ?? 0) + 1;
  const sanity = {
    zeroOrNegative: shopRows.filter((r) => !(newPrice(r) > 0)).map((r) => r.id),
    wasNotAbovePrice: shopRows.filter((r) => newWas(r) != null && newWas(r) <= newPrice(r)).map((r) => r.id),
    premiumDropsOver90: plan.changes
      .filter((c) => c.tier === "premium" && c.price < c.row.price * 0.1)
      .map((c) => ({ id: c.row.id, old: c.row.price, new: c.price })),
    biggestCuts: plan.changes
      .filter((c) => c.price < c.row.price)
      .sort((a, b) => a.price / a.row.price - b.price / b.row.price)
      .slice(0, 15)
      .map((c) => ({ id: c.row.id, title: bareTitle(c.row.title).slice(0, 70), old: c.row.price, new: c.price, sourceUgx: c.sourceUgx })),
  };
  const belowCost = plan.changes.filter((c) => c.floor && c.price < c.floor);
  const conflicts = {
    belowCostCount: belowCost.length,
    belowCostByTier: belowCost.reduce((acc, c) => ({ ...acc, [c.tier]: (acc[c.tier] ?? 0) + 1 }), {}),
    belowCostWorst: belowCost
      .sort((a, b) => a.price / a.floor - b.price / b.floor)
      .slice(0, 20)
      .map((c) => ({ id: c.row.id, title: bareTitle(c.row.title).slice(0, 70), price: c.price, costFloor: c.floor, tier: c.tier })),
  };
  const top20 = [...shopRows]
    .sort((a, b) => newPrice(b) - newPrice(a))
    .slice(0, 20)
    .map((r) => ({ id: r.id, title: bareTitle(r.title).slice(0, 80), old: r.price, new: newPrice(r) }));

  return {
    shop,
    generatedAt: new Date().toISOString(),
    allowRaise,
    summary: {
      listings: shopRows.length,
      priced: plan.changes.length,
      rowsToWrite: plan.changes.filter(changed).length,
      priceCuts: plan.changes.filter((c) => c.price < c.row.price).length,
      wasPriceChanges: plan.changes.filter((c) => (c.original ?? null) !== (c.row.original_price ?? null)).length,
      noSource: plan.unmatched.length,
      notes,
      old: dist(shopRows.map((r) => r.price)),
      new: dist(shopRows.map(newPrice)),
      basketChangePct: Math.round(
        (shopRows.reduce((s, r) => s + newPrice(r), 0) / shopRows.reduce((s, r) => s + r.price, 0) - 1) * 1000
      ) / 10,
    },
    perAisle,
    reference,
    sanity,
    conflicts,
    top20,
  };
}

function printReport(rep) {
  const s = rep.summary;
  console.log(
    `\n${rep.shop}: ${s.listings} listings, ${s.priced} priced, ${s.rowsToWrite} rows to write ` +
      `(${s.priceCuts} price cuts, ${s.wasPriceChanges} was-price changes), no source ${s.noSource}, basket ${s.basketChangePct}%`
  );
  console.log(`  median ${s.old.median} → ${s.new.median} UGX ($${s.old.medianUsd} → $${s.new.medianUsd}) | notes ${JSON.stringify(s.notes)}`);
  for (const a of rep.perAisle) {
    console.log(`  ${a.aisle.padEnd(22)} n=${String(a.n).padStart(6)}  median ${String(a.old.median).padStart(8)} → ${String(a.new.median).padStart(8)}  max ${String(a.old.max).padStart(9)} → ${String(a.new.max).padStart(9)}`);
  }
  console.log("  reference items (median old → new | Uganda benchmark):");
  for (const r of rep.reference) {
    const bench = r.benchmark.map((b) => `${b.tier} ${b.ugxLow}-${b.ugxHigh}`).join("; ") || "—";
    console.log(`    ${r.label.padEnd(24)} n=${String(r.n).padStart(5)}  ${r.oldMedian} → ${r.newMedian} | ${bench}`);
  }
  console.log(`  sanity: zero/neg ${rep.sanity.zeroOrNegative.length}, was≤price ${rep.sanity.wasNotAbovePrice.length}, premium >90% drops ${rep.sanity.premiumDropsOver90.length}`);
  console.log(`  below landed cost ×1.05 after plan: ${rep.conflicts.belowCostCount} ${JSON.stringify(rep.conflicts.belowCostByTier)}`);
}

async function backupShop(shop, rows) {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const file = path.join(BACKUP_DIR, `reprice-${shop}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  const scope = rows.filter((r) => shopOf(r.id) === shop);
  await fs.writeFile(file, JSON.stringify(scope.map((r) => ({ id: r.id, price: r.price, original_price: r.original_price ?? null }))));
  console.log(`Backup (${scope.length} rows): ${file}`);
  return file;
}

/** Rows sharing the same new price + was-price are written with one `in (ids)` update. */
async function applyChanges(db, changes) {
  const groups = new Map();
  for (const c of changes) {
    const key = `${c.price}|${c.original ?? ""}`;
    if (!groups.has(key)) groups.set(key, { price: c.price, original_price: c.original ?? null, ids: [] });
    groups.get(key).ids.push(c.row.id);
  }
  const jobs = [];
  for (const g of groups.values()) {
    for (let i = 0; i < g.ids.length; i += 150) jobs.push({ ...g, ids: g.ids.slice(i, i + 150) });
  }
  let done = 0;
  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      const job = jobs[next++];
      await withRetries(async () => {
        const { error } = await db
          .from("products")
          .update({ price: job.price, original_price: job.original_price })
          .in("id", job.ids);
        if (error) throw error;
      }, `update ${job.ids[0]}`);
      const before = done;
      done += job.ids.length;
      if (Math.floor(done / 1000) > Math.floor(before / 1000) || done === changes.length) {
        console.log(`  updated ${done}/${changes.length}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));
}

async function main() {
  const db = requireSupabase();
  const shops = shopArg === "all" ? ["fresh", "kitchen", "cosmetics"] : [shopArg];
  const rows = await loadProducts(db, auditOnly ? shops.filter((s) => s !== "fresh") : shops);

  if (auditOnly) {
    for (const shop of shops.filter((s) => s !== "fresh")) {
      const rep = await buildReport(shop, { changes: [], unmatched: [] }, rows);
      const out = `/tmp/price-audit-${shop}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      await fs.writeFile(out, JSON.stringify(rep, null, 1));
      printReport(rep);
      console.log("  top 20:");
      for (const t of rep.top20) console.log(`    ${String(t.old).padStart(9)}  ${t.title}`);
      console.log(`  audit → ${out}`);
    }
    return;
  }

  for (const shop of shops) {
    const plan =
      shop === "fresh"
        ? planFresh(rows)
        : shop === "kitchen"
          ? await planKitchen(rows)
          : shop === "cosmetics"
            ? await planCosmetics(rows)
            : null;
    if (!plan) throw new Error(`Unknown --shop ${shop}`);

    if (shop !== "fresh") {
      const rep = await buildReport(shop, plan, rows);
      printReport(rep);
      if (dryRun) {
        const out = `/tmp/reprice-plan-${shop}.json`;
        await fs.writeFile(
          out,
          JSON.stringify({ ...rep, changes: plan.changes.filter(changed).map((c) => ({ id: c.row.id, title: bareTitle(c.row.title), old: c.row.price, new: c.price, oldWas: c.row.original_price, newWas: c.original, tier: c.tier, floor: c.floor, note: c.note })) }, null, 1)
        );
        console.log(`  plan → ${out}`);
      }
    } else {
      const moved = plan.changes.filter(changed);
      console.log(`\nFresh: ${plan.changes.length} priced, ${moved.length} changed, ${plan.unmatched.length} unmatched`);
      for (const c of (verbose ? moved : moved.slice(0, 14))) {
        console.log(`  ${String(c.row.price).padStart(9)} → ${String(c.price).padStart(9)}  ${(c.row.unit || "").padEnd(12)} ${c.row.title.slice(0, 64)}`);
      }
      for (const r of plan.unmatched.slice(0, 20)) console.log(`  ? unmatched: ${r.title} (${r.unit})`);
    }
    if (dryRun) continue;

    let toWrite = plan.changes.filter(changed);
    if (limitArg > 0) toWrite = toWrite.slice(0, limitArg);
    if (!toWrite.length) {
      console.log(`\n${shop}: nothing to update.`);
      continue;
    }
    await backupShop(shop, rows);
    console.log(`Writing ${toWrite.length} ${shop} rows (concurrency ${CONCURRENCY})…`);
    await applyChanges(db, toWrite);
    console.log(`${shop}: done.`);
  }
}

main().catch((err) => {
  console.error("Reprice failed:", err.message);
  process.exit(1);
});
