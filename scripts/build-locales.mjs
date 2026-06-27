/**
 * Merge en.json structure with per-language translation bundles.
 * Run: node scripts/build-locales.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { fr } from "./i18n/bundles/fr.mjs";
import { sw } from "./i18n/bundles/sw.mjs";
import { ln } from "./i18n/bundles/ln.mjs";
import { rw } from "./i18n/bundles/rw.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, "../src/i18n/locales");

function deepMerge(target, source) {
  if (!source || typeof source !== "object") return target;
  for (const key of Object.keys(source)) {
    const sv = source[key];
    if (sv !== null && typeof sv === "object" && !Array.isArray(sv)) {
      if (!target[key] || typeof target[key] !== "object" || Array.isArray(target[key])) {
        target[key] = {};
      }
      deepMerge(target[key], sv);
    } else {
      target[key] = sv;
    }
  }
  return target;
}

const en = JSON.parse(fs.readFileSync(path.join(localesDir, "en.json"), "utf8"));

function mergeProductTerms(out, code) {
  const termsPath = path.join(__dirname, `i18n/generated/product-terms-${code}.json`);
  if (!fs.existsSync(termsPath)) {
    console.warn(`Skip product terms for ${code} (run: node scripts/generate-product-terms.mjs)`);
    return;
  }
  const { terms, delivery, description } = JSON.parse(fs.readFileSync(termsPath, "utf8"));
  if (!out.products) out.products = {};
  out.products.terms = terms;
  out.products.delivery = delivery;
  out.products.description = description;
}

for (const [code, bundle] of [
  ["fr", fr],
  ["sw", sw],
  ["ln", ln],
  ["rw", rw],
]) {
  const out = deepMerge(JSON.parse(JSON.stringify(en)), bundle);
  mergeProductTerms(out, code);
  fs.writeFileSync(path.join(localesDir, `${code}.json`), `${JSON.stringify(out, null, 2)}\n`);
  console.log(`Wrote ${code}.json`);
}
