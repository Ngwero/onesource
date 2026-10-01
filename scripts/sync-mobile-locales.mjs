/**
 * Copy the website's translation files into the Flutter app so both stay in sync.
 *
 *   node scripts/sync-mobile-locales.mjs
 *
 * Writes mobile/assets/i18n/{en,fr,sw,ln,rw}.json and product_rules.json.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COMMON_PHRASES, WORD_RULES } from "../src/i18n/productTermRules.mjs";
import { APP_STRINGS } from "./i18n/mobile-app-strings.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "src/i18n/locales");
const outDir = path.join(root, "mobile/assets/i18n");
const LANGS = ["en", "fr", "sw", "ln", "rw"];

await fs.mkdir(outDir, { recursive: true });

function setPath(obj, dotted, value) {
  const parts = dotted.split(".");
  let node = obj;
  for (const p of parts.slice(0, -1)) node = node[p] ??= {};
  node[parts.at(-1)] = value;
}

for (const [i, lang] of LANGS.entries()) {
  const json = JSON.parse(await fs.readFile(path.join(srcDir, `${lang}.json`), "utf8"));
  json.app = {};
  for (const [key, values] of Object.entries(APP_STRINGS)) {
    if (values.length !== LANGS.length) throw new Error(`app.${key}: expected ${LANGS.length} values`);
    setPath(json.app, key, values[i]);
  }
  await fs.writeFile(path.join(outDir, `${lang}.json`), JSON.stringify(json));
}

const rules = Object.fromEntries(
  Object.entries(WORD_RULES).map(([lang, list]) => [
    lang,
    list.map(([re, replacement]) => [re.source, replacement]),
  ])
);
await fs.writeFile(
  path.join(outDir, "product_rules.json"),
  JSON.stringify({ phrases: COMMON_PHRASES, rules })
);

console.log(`Synced ${LANGS.length} locales + product rules → ${path.relative(root, outDir)}`);
