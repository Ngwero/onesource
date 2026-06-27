/**
 * Generate products.terms (+ delivery/description helpers) for locale bundles.
 * Run: node scripts/generate-product-terms.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { KEYWORD_CATALOG } from "../server/data/keywordCatalog.js";
import { BULK_CATALOG } from "../server/data/bulkCatalog.js";
import { translateSegment } from "./i18n/segment-translator.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function segmentKey(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function collectSegmentsFromTitle(title, segments) {
  const base = title.replace(/\s*–\s*One Source$/i, "").trim();
  for (const part of base.split(" – ")) {
    const p = part.trim();
    if (p) segments.add(p);
  }
}

function collectSegments() {
  const segments = new Set();
  const add = (title) => collectSegmentsFromTitle(title, segments);

  for (const k of KEYWORD_CATALOG) {
    for (const t of k.templates ?? []) add(t.name);
  }
  for (const c of BULK_CATALOG) {
    for (const i of c.items ?? []) add(i.name);
  }

  return segments;
}

async function collectSegmentsFromApi() {
  const segments = new Set();
  const apiBase = process.env.API_BASE ?? "http://localhost:3001";
  const pageSize = 1000;
  let page = 0;
  let totalLoaded = 0;

  try {
    while (true) {
      const res = await fetch(
        `${apiBase}/api/products?admin=true&page=${page}&pageSize=${pageSize}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const batch = data.products ?? [];
      for (const p of batch) {
        if (p.title) collectSegmentsFromTitle(p.title, segments);
      }
      totalLoaded += batch.length;
      if (batch.length < pageSize) break;
      page += 1;
    }
    console.log(`Loaded ${totalLoaded} products from API for term extraction`);
  } catch (e) {
    console.warn(`API term extraction skipped (${e.message}) — using catalog only`);
  }
  return segments;
}

const catalogSegments = collectSegments();
const apiSegments = await collectSegmentsFromApi();
const segments = [...new Set([...catalogSegments, ...apiSegments])].sort();
console.log(`Generating terms for ${segments.length} segments`);

const extras = {
  fr: {
    delivery: {
      freeOver: "Livraison GRATUITE le jour même dès {{amount}} USh",
      freeTomorrow: "Livraison GRATUITE le jour même demain",
      freeSameDay: "Livraison GRATUITE le jour même",
    },
    description: {
      listedForSearch:
        'Référencé pour la recherche « {{keyword}} ». Ajoutez votre photo produit dans l\'admin pour remplacer l\'image.',
      uploadPhoto:
        "Téléversez la photo de votre produit dans l'admin pour remplacer l'image provisoire.",
    },
  },
  sw: {
    delivery: {
      freeOver: "Uwasilishaji WA BURE siku hiyo hiyo kwa agizo zaidi ya {{amount}} USh",
      freeTomorrow: "Uwasilishaji WA BURE siku hiyo hiyo kesho",
      freeSameDay: "Uwasilishaji WA BURE siku hiyo hiyo",
    },
    description: {
      listedForSearch:
        'Imeorodheshwa kwa utafutaji "{{keyword}}". Pakia picha yako kwenye admin.',
      uploadPhoto: "Pakia picha ya bidhaa kwenye admin ili kubadilisha picha ya muda.",
    },
  },
  ln: {
    delivery: {
      freeOver: "Livraison GRATUITE mokolo moko kobanda na {{amount}} USh",
      freeTomorrow: "Livraison GRATUITE mokolo moko lobi",
      freeSameDay: "Livraison GRATUITE mokolo moko",
    },
    description: {
      listedForSearch:
        'Ezali na liste mpo na boluki "{{keyword}}". Tia foto na yo na admin.',
      uploadPhoto: "Tia foto ya produit na yo na admin mpo na remplacer image.",
    },
  },
  rw: {
    delivery: {
      freeOver: "Gutanga ubuntu ku munsi umwe guhera kuri {{amount}} USh",
      freeTomorrow: "Gutanga ubuntu ku munsi umwe ejo",
      freeSameDay: "Gutanga ubuntu ku munsi umwe",
    },
    description: {
      listedForSearch:
        'Byanditswe kuri "{{keyword}}" isakuzo. Shyiraho ifoto muri admin.',
      uploadPhoto: "Shyiraho ifoto y'igicuruzwa muri admin usimbuze ifoto y'agateganyo.",
    },
  },
};

for (const lang of ["fr", "sw", "ln", "rw"]) {
  const terms = {};
  for (const seg of segments) {
    const key = segmentKey(seg);
    terms[key] = translateSegment(seg, lang);
  }

  const outPath = path.join(__dirname, `i18n/generated/product-terms-${lang}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify({ terms, ...extras[lang] }, null, 2) + "\n"
  );
  console.log(`Wrote ${outPath}`);
}
