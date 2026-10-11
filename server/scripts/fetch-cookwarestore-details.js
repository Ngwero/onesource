#!/usr/bin/env node
/**
 * Fetches manufacturer description + specification list for every Cookware Store
 * product in the scraper CSV and caches them as JSON (resumable).
 *
 * Honours robots.txt "Crawl-delay: 3" (one request at a time, 3 s apart).
 *
 *   node scripts/fetch-cookwarestore-details.js [--csv path] [--out dir] [--limit N]
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const arg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const CSV = arg("csv", path.join(os.homedir(), "cookwarestore-scraper/products/products.csv"));
const OUT = arg("out", path.join(os.homedir(), "onesource-details/cws"));
const LIMIT = Number(arg("limit", "0")) || Infinity;
const DELAY_MS = 3000;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
const stripTags = (s) => decode(s.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]+>/g, "")).replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

function jsonField(html, key) {
  const m = html.match(new RegExp(`&quot;${key}&quot;:&quot;(.*?)&quot;,&quot;`, "s"));
  if (!m) return "";
  try {
    return JSON.parse(`"${decode(m[1]).replace(/"/g, '\\"')}"`);
  } catch {
    return decode(m[1]);
  }
}

export function parseCwsPage(html) {
  let ld = null;
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>(.*?)<\/script>/gs)) {
    try {
      const j = JSON.parse(m[1]);
      if (j["@type"] === "Product") { ld = j; break; }
    } catch { /* ignore */ }
  }
  const specs = [];
  const flags = [];
  const short = jsonField(html, "shortDescription");
  for (const li of short.matchAll(/<li>(.*?)<\/li>/gs)) {
    const t = stripTags(li[1]).replace(/\s+/g, " ").trim();
    if (!t) continue;
    const i = t.indexOf(":");
    if (i > 0 && i < 40) specs.push({ label: t.slice(0, i).trim(), value: t.slice(i + 1).trim() });
    else flags.push(t);
  }
  const descriptionHtml = jsonField(html, "descriptionHtml");
  return {
    name: ld?.name || "",
    brand: ld?.brand?.name || "",
    gtin: ld?.gtin13 || ld?.sku || "",
    description: descriptionHtml ? stripTags(descriptionHtml) : (ld?.description || "").trim(),
    specs,
    flags,
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const rows = parseCsv(fs.readFileSync(CSV, "utf8"));
  const seen = new Set();
  const todo = [];
  for (const r of rows) {
    if (!r.product_id || !r.url || seen.has(r.product_id)) continue;
    seen.add(r.product_id);
    if (!fs.existsSync(path.join(OUT, `${r.product_id}.json`))) todo.push(r);
  }
  console.log(`${seen.size} products, ${todo.length} still to fetch → ${OUT}`);
  let ok = 0;
  let fail = 0;
  for (const r of todo.slice(0, LIMIT)) {
    const started = Date.now();
    try {
      const res = await fetch(r.url, { headers: { "User-Agent": UA, Accept: "text/html" } });
      if (res.status === 404 || res.status === 410) {
        fs.writeFileSync(path.join(OUT, `${r.product_id}.json`), JSON.stringify({ id: r.product_id, url: r.url, gone: true }));
      } else if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      } else {
        const d = parseCwsPage(await res.text());
        fs.writeFileSync(path.join(OUT, `${r.product_id}.json`), JSON.stringify({ id: r.product_id, url: r.url, ...d }));
        ok++;
      }
    } catch (e) {
      fail++;
      console.warn(`✗ ${r.product_id} ${e.message}`);
      if (fail > 50 && fail > ok) { console.error("Too many failures, stopping."); break; }
    }
    if ((ok + fail) % 100 === 0) console.log(`  ${ok} saved, ${fail} failed`);
    await sleep(Math.max(0, DELAY_MS - (Date.now() - started)));
  }
  console.log(`Done: ${ok} saved, ${fail} failed`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
