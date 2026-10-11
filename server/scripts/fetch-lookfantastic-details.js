#!/usr/bin/env node
/**
 * Matches our cosmetics listings to Lookfantastic product pages (public product
 * sitemap, strict brand/name/size match) and caches the manufacturer information:
 * description, how to use, ingredient benefits, full ingredients list, warnings and
 * the 1500px product image.
 *
 *   node scripts/fetch-lookfantastic-details.js [--sitemap path] [--limit N]
 *
 * One request every 2 s. Resumable: pages already cached are skipped.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { requireSupabase } from "../lib/supabase.js";
import { lfIndex, matchLf } from "../lib/cosmeticsMatch.js";

const args = process.argv.slice(2);
const arg = (n, d) => (args.indexOf(`--${n}`) >= 0 ? args[args.indexOf(`--${n}`) + 1] : d);
const SITEMAP = arg("sitemap", path.join(os.homedir(), "lf-sitemap/products.txt"));
const OUT = path.join(os.homedir(), "onesource-details/lf");
const LIMIT = Number(arg("limit", "0")) || Infinity;
const DELAY_MS = 2000;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
const toText = (html) =>
  decode(
    html
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<\/(p|li|div|h\d)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();

export function parseLfPage(html) {
  let ld = null;
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>(.*?)<\/script>/gs)) {
    try {
      const j = JSON.parse(m[1]);
      if (j["@type"] === "Product" || j["@type"] === "ProductGroup") { ld = j; break; }
    } catch { /* ignore */ }
  }
  const sections = {};
  for (const m of html.matchAll(/aria-label="([^"]+)" aria-controls="(product-description-\d+)"/g)) {
    const [, label, id] = m;
    const start = html.indexOf(`id="${id}"`);
    if (start < 0) continue;
    const open = html.indexOf(">", start) + 1;
    const end = html.indexOf("</accordion-item>", open);
    const text = toText(html.slice(open, end > 0 ? end : open + 20000));
    if (text) sections[decode(label)] = text.replace(/\n?For the latest information, it is recommended.*$/s, "").trim();
  }
  let brand = "";
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>(.*?)<\/script>/gs)) {
    try {
      const j = JSON.parse(m[1]);
      if (j["@type"] === "BreadcrumbList") {
        const b = j.itemListElement.find((e) => /\/c\/brands\/[^/]+\/$/.test(e.item?.["@id"] || ""));
        if (b) brand = b.name;
      }
    } catch { /* ignore */ }
  }
  return {
    name: ld?.name || "",
    brand,
    description: (ld?.description || "").trim(),
    image: typeof ld?.image === "string" ? ld.image : ld?.image?.[0] || "",
    sections,
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const index = lfIndex(fs.readFileSync(SITEMAP, "utf8").split("\n"));
  const db = requireSupabase();
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("products").select("id,title,description").like("id", "cosmetics-%").order("id").range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  const matches = {};
  for (const r of rows) {
    const lfId = r.id.match(/-lf-(\d+)$/)?.[1];
    if (lfId) {
      const hit = index.find((c) => c.id === lfId);
      if (hit) { matches[r.id] = { url: hit.url, lfId, exact: true, missing: [] }; continue; }
    }
    const brand = (r.description || "").match(/Authentic (.+?) [a-z]/)?.[1];
    const m = matchLf(r.title, brand, index);
    if (m) matches[r.id] = { url: m.url, lfId: m.id, exact: m.exact, missing: m.missing };
  }
  fs.writeFileSync(path.join(OUT, "_matches.json"), JSON.stringify(matches, null, 1));
  const todo = [...new Set(Object.values(matches).map((m) => m.lfId))]
    .filter((id) => !fs.existsSync(path.join(OUT, `${id}.json`)))
    .slice(0, LIMIT);
  console.log(`${rows.length} cosmetics, ${Object.keys(matches).length} matched, ${todo.length} pages to fetch`);
  const urlById = new Map(Object.values(matches).map((m) => [m.lfId, m.url]));
  let ok = 0;
  let fail = 0;
  for (const id of todo) {
    const started = Date.now();
    try {
      const res = await fetch(urlById.get(id), { headers: { "User-Agent": UA, Accept: "text/html" }, redirect: "follow" });
      if (res.status === 404 || res.status === 410) {
        fs.writeFileSync(path.join(OUT, `${id}.json`), JSON.stringify({ id, gone: true }));
      } else if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      } else {
        const d = parseLfPage(await res.text());
        if (!d.name) throw new Error("no product data (blocked?)");
        fs.writeFileSync(path.join(OUT, `${id}.json`), JSON.stringify({ id, url: res.url, ...d }));
        ok++;
      }
    } catch (e) {
      fail++;
      console.warn(`✗ ${id} ${e.message}`);
      if (fail >= 10 && fail > ok) { console.error("Too many failures, stopping."); break; }
    }
    if ((ok + fail) % 50 === 0) console.log(`  ${ok} saved, ${fail} failed`);
    await sleep(Math.max(0, DELAY_MS - (Date.now() - started)));
  }
  console.log(`Done: ${ok} saved, ${fail} failed`);
}

main().catch((e) => { console.error(e); process.exit(1); });
