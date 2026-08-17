/**
 * Offline kitchen furniture specs → onesource KITCHEN storefront JSON.
 *
 * Legal note: Do NOT scrape IKEA or other retailer sites with this script.
 * Author your own specs (or use supplier sheets you are licensed to use)
 * in data/kitchen-specs.input.json, then run:
 *
 *   cd server && npm run kitchen:transform
 *
 * Optional OpenAI rewrite (original marketing copy):
 *   OPENAI_API_KEY=sk-… npm run kitchen:transform -- --llm
 *
 * Without --llm, deterministic local templates produce original titles/descriptions.
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const INPUT = path.join(ROOT, "data", "kitchen-specs.input.json");
const OUTPUT = path.join(ROOT, "data", "kitchen-storefront.output.json");

const useLlm = process.argv.includes("--llm");

/** Rough USD retail → UGX shelf price (local retail uplift, rounded to 1000s). */
function usdToUgx(usd) {
  // Map USD retail to Kampala shelf (not 1:1 FX). $40 cart ≈ UGX 72k.
  const ugx = Number(usd) * 1800;
  return Math.max(15000, Math.round(ugx / 1000) * 1000);
}

function slugify(title) {
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function mapCategory(raw) {
  const s = String(raw || "").toLowerCase();
  if (/island|cart|trolley/.test(s)) return "Kitchen Carts";
  if (/step|stool|ladder/.test(s)) return "Step Stools";
  if (/shelf|wall|rail/.test(s)) return "Open Shelving";
  if (/organizer|rack|storage|pantry/.test(s)) return "Kitchen Organizers";
  return "Kitchen Furniture";
}

function localRewrite(spec) {
  const type = String(spec.product_type || "kitchen piece").trim();
  const dims = String(spec.dimensions || "").trim();
  const mats = String(spec.materials || "durable materials").trim();
  const features = (spec.key_features || []).filter(Boolean);

  const titleBits = [];
  if (/3[-\s]?tier|three[-\s]?tier/i.test([...features, type].join(" "))) {
    titleBits.push("3-Tier");
  }
  if (/roll|caster|castor|mobile|wheel/i.test([...features, type].join(" "))) {
    titleBits.push("Rolling");
  }
  if (/mesh/i.test([...features, mats, type].join(" "))) titleBits.push("Mesh");
  if (/steel/i.test(mats)) titleBits.push("Steel");
  if (/bamboo|oak|pine|wood/i.test(mats)) titleBits.push("Timber");
  titleBits.push(type.replace(/^./, (c) => c.toUpperCase()));

  let title = titleBits.join(" ");
  if (title.split(" ").length < 3) {
    title = `Premium ${type}`.replace(/\s+/g, " ").trim();
  }
  // High-converting descriptive title (never use manufacturer series names)
  title = title
    .replace(/\b utility cart\b/i, " Utility Cart")
    .replace(/\s+/g, " ")
    .trim();
  if (!/premium|solid|compact|freestanding/i.test(title)) {
    title = `Premium ${title}`;
  }

  const feat1 = features[0] || "practical everyday storage";
  const feat2 = features[1] || "easy cleaning";
  const desc = [
    `Bring order to your cooking space with this ${type.toLowerCase()} sized for real Ugandan kitchens${dims ? ` (${dims})` : ""}.`,
    `Crafted with ${mats.toLowerCase()}, it is built for daily use and designed around ${feat1.toLowerCase()}.`,
    `Home cooks love the ${feat2.toLowerCase()} — a smart upgrade for prep, serving, and tidy storage without a fitted renovation.`,
  ].join(" ");

  return { title, description: desc };
}

async function llmRewrite(spec) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.warn("OPENAI_API_KEY missing — falling back to local rewrite");
    return localRewrite(spec);
  }

  const prompt = `You write original retail copy for onesource KITCHEN (Uganda).
Given factual specs only, output JSON with keys: title, description.
Rules:
- title: descriptive retail name, NO trademarked series names, high-converting
- description: exactly 3 original sentences; do not copy any retailer phrasing
- Use materials/features as facts only

Specs:
${JSON.stringify(
  {
    product_type: spec.product_type,
    dimensions: spec.dimensions,
    materials: spec.materials,
    key_features: spec.key_features,
  },
  null,
  2
)}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return only valid JSON." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    console.warn("LLM failed:", await res.text());
    return localRewrite(spec);
  }
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(raw);
    if (parsed.title && parsed.description) return parsed;
  } catch {
    /* fall through */
  }
  return localRewrite(spec);
}

async function transformOne(spec) {
  const rewritten = useLlm ? await llmRewrite(spec) : localRewrite(spec);
  const title = rewritten.title;
  const priceUsd = Number(spec.approx_usd_retail ?? 40);

  return {
    category: mapCategory(spec.category || spec.product_type),
    title,
    // Optional internal note — leave empty unless YOU assigned a non-trademark code
    original_reference: String(spec.internal_sku || "").trim() || undefined,
    price_ugx: usdToUgx(priceUsd),
    description: rewritten.description,
    dimensions: String(spec.dimensions || "").trim() || undefined,
    image_path: `/images/placeholder/${slugify(title)}.jpg`,
  };
}

async function main() {
  const raw = await fs.readFile(INPUT, "utf8");
  const specs = JSON.parse(raw);
  if (!Array.isArray(specs)) throw new Error("Input must be a JSON array");

  const out = [];
  for (const spec of specs) {
    const row = await transformOne(spec);
    if (!row.original_reference) delete row.original_reference;
    out.push(row);
    console.log(`✓ ${row.title} — USh ${row.price_ugx.toLocaleString()}`);
  }

  await fs.writeFile(OUTPUT, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`\nWrote ${out.length} products → ${path.relative(ROOT, OUTPUT)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
