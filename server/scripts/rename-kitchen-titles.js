/**
 * Rewrite kitchen-ware product titles into everyday names
 * (drop IKEA series codes like FINMAT / SEKTION / KNOXHULT).
 *
 *   cd server && node scripts/rename-kitchen-titles.js
 *   cd server && node scripts/rename-kitchen-titles.js --dry-run
 */
import { requireSupabase } from "../lib/supabase.js";
import { KITCHEN_WARE_CATEGORY_ID } from "../data/kitchenWareCatalog.js";

const dryRun = process.argv.includes("--dry-run");

const SERIES_PREFIX =
  /^[A-ZÄÖÅÉÜÁÍÓÚÑ0-9][A-ZÄÖÅÉÜÁÍÓÚÑ0-9\-]{2,}(?:\s+[A-ZÄÖÅÉÜÁÍÓÚÑ0-9][A-ZÄÖÅÉÜÁÍÓÚÑ0-9\-]{2,})?\s+/u;

function humanizeKitchenTitle(rawTitle) {
  let t = String(rawTitle ?? "")
    .replace(/\s*[–—-]\s*One Source\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  for (let i = 0; i < 3; i += 1) {
    const next = t.replace(SERIES_PREFIX, "");
    if (next === t) break;
    t = next;
  }

  const replacements = [
    [/\bcab\b/gi, "cabinet"],
    [/\bw\//gi, "with "],
    [/\bw\b(?=\s+\d)/gi, "with"],
    [/doors(\d)/gi, "doors and $1"],
    [/drawers(\d)/gi, "drawers and $1"],
    [/copperstainless/gi, "copper stainless"],
    [/stainlessbeech/gi, "stainless steel and beech"],
    [/stainlesssteelglass/gi, "stainless steel and glass"],
    [/stainlesssteelnon-stick/gi, "stainless steel non-stick"],
    [/stainlesssteelblack/gi, "stainless steel and black"],
    [/stainless steelglass/gi, "stainless steel and glass"],
    [/stainless steelbeech/gi, "stainless steel and beech"],
    [/stainless steelblack/gi, "stainless steel and black"],
    [/stainlesssteel/gi, "stainless steel"],
    [/metalwhite/gi, "metal and white"],
    [/reddark/gi, "red and dark"],
    [/glassbamboo/gi, "glass and bamboo"],
    [/glassstainless/gi, "glass stainless"],
    [/clear glassstainless/gi, "clear glass and stainless"],
    [/glassplastic/gi, "glass and plastic"],
    [/square glassplastic/gi, "square glass and plastic"],
    [/rectangularplastic/gi, "rectangular plastic"],
    [/rectangular glassplastic/gi, "rectangular glass and plastic"],
    [/whiteturquoise/gi, "white and turquoise"],
    [/greenwhite/gi, "green and white"],
    [/transparentmulticolor/gi, "clear multicolour"],
    [/^365\+\s*/i, ""],
    [/oak effect/gi, "oak-look"],
    [/ash effect/gi, "ash-look"],
    [/non-stick coating black/gi, "black non-stick"],
    [/gray/gi, "grey"],
    [/\s+,/g, ","],
    [/,\s*/g, ", "],
    [/\s+/g, " "],
  ];

  for (const [pattern, replacement] of replacements) {
    t = t.replace(pattern, replacement);
  }

  t = t.trim().replace(/^,\s*|,\s*$/g, "");
  if (!t) return "Kitchen item";
  t = t
    .replace(/^Modular kitchen set faucet/i, "Kitchen faucet")
    .replace(/^Modular kitchen set countertop/i, "Kitchen countertop");
  if (/^corner kitchen\b/i.test(t)) {
    t = t.replace(/^corner kitchen/i, "Corner modular kitchen");
  } else if (/^kitchen(?=,|$)/i.test(t)) {
    t = t.replace(/^kitchen/i, "Modular kitchen set");
  }
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function buildDescription(title, existing) {
  const name = humanizeKitchenTitle(title);
  if (existing && !/Article\s+\d+/i.test(existing) && !/^[A-Z]{4,}\s—/.test(existing)) {
    // Still rewrite if it starts with a series code
    if (!SERIES_PREFIX.test(existing.replace(/\s*[–—].*$/, "") + " ")) {
      return `${name}. Ready for home kitchens — add it to the same basket as your fresh produce.`;
    }
  }
  return `${name}. Everyday kitchen piece from One Source Kitchen Ware — sized for home use and ready for same-day delivery with your produce order.`;
}

async function main() {
  const db = requireSupabase();
  const rows = [];
  let from = 0;
  const page = 500;

  for (;;) {
    const { data, error } = await db
      .from("products")
      .select("id, title, description")
      .eq("category", KITCHEN_WARE_CATEGORY_ID)
      .range(from, from + page - 1);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < page) break;
    from += page;
  }

  console.log(`Loaded ${rows.length} kitchen-ware products`);

  const updates = [];
  for (const row of rows) {
    const human = humanizeKitchenTitle(row.title);
    const title = `${human} – One Source`;
    if (title === row.title) continue;
    updates.push({
      id: row.id,
      title,
      description: buildDescription(row.title, row.description),
      before: row.title,
    });
  }

  console.log(`Will update ${updates.length} titles`);
  for (const u of updates.slice(0, 12)) {
    console.log(`  ${u.before}`);
    console.log(`  → ${u.title}`);
  }
  if (updates.length > 12) console.log(`  … +${updates.length - 12} more`);

  if (dryRun) {
    console.log("Dry run — no writes.");
    return;
  }

  let done = 0;
  for (let i = 0; i < updates.length; i += 40) {
    const chunk = updates.slice(i, i + 40);
    await Promise.all(
      chunk.map(async (u) => {
        const { error } = await db
          .from("products")
          .update({ title: u.title, description: u.description })
          .eq("id", u.id);
        if (error) throw error;
      })
    );
    done += chunk.length;
    console.log(`  updated ${done}/${updates.length}`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error("Rename failed:", err.message);
  process.exit(1);
});
