/**
 * At least 12 product name templates per category for seed-fill-categories.
 * Merged from bulkCatalog + extras so every department can reach 12 SKUs.
 */
import { BULK_CATALOG } from "./bulkCatalog.js";
import { AGRI_CATEGORIES } from "./categories.js";

export const MIN_PRODUCTS_PER_CATEGORY = 12;

const UNITS = ["per kg", "per pack", "each", "per bunch", "per 500g", "per litre"];

/** Extra names per category (beyond bulkCatalog) */
const EXTRAS = {
  "fresh-fruits": [
    "Oranges – Navel",
    "Oranges – Valencia",
    "Oranges – Sweet",
    "Blood Oranges",
    "Tangerines – Pack",
    "Passion Fruit – Sweet",
    "Passion Fruit – Large Grade",
    "Dragon Fruit",
    "Guava – Ripe",
    "Lemons – Juicing",
    "Grapes – Red Seedless",
    "Pears – Packham",
    "Strawberries – Punnet",
  ],
  "fresh-vegetables": [
    "Courgettes – Green",
    "Aubergine – Medium",
    "Cucumber – English",
    "Spring Onions – Bunch",
    "Leeks – Washed",
    "Butternut Squash",
    "Green Beans – Fine",
    "Rocket – Bag",
  ],
  "roots-and-tubers": [
    "Arrowroot – Fresh",
    "Taro Root",
    "Plantain – Green",
    "Turnips – Washed",
    "Parsnips",
    "Radish – Bunch",
    "Ginger – Root",
    "Ginger – Fresh",
    "Ginger – Organic",
    "Ginger – Young",
    "Ginger – Premium",
    "Ginger – Local Farm",
    "Ginger – Export Grade",
    "Ginger – Bulk 1kg",
    "Ginger – Paste",
    "Ginger – Grade A",
  ],
  "cereals-and-grains": [
    "Maize – On Cob",
    "Barley – Pearl",
    "Oats – Rolled",
    "Quinoa",
    "Brown Rice – 2kg",
    "Maize Grits",
    "Wheat Grain",
  ],
  "legumes-and-pulses": [
    "Chickpeas – Dried",
    "Black Beans",
    "Pigeon Peas",
    "Green Gram",
    "Bambara Nuts",
    "Broad Beans",
    "Beans – Red Kidney",
    "Beans – Black",
    "Beans – White",
    "Beans – Pinto",
    "Beans – Navy",
    "Beans – Cannellini",
    "Beans – Lima",
    "Beans – Mung",
    "Beans – Adzuki",
    "Beans – Borlotti",
    "Beans – Great Northern",
    "Beans – Butter",
    "Beans – Cranberry",
    "Beans – Haricot",
    "Beans – Fava",
    "Beans – Yellow Eye",
    "Beans – Organic",
    "Beans – Local Farm",
    "Beans – Export Grade",
    "Beans – Bulk 25kg",
    "Beans – Stew Mix",
    "Beans – Soup Mix",
    "Green Beans – Fine",
    "French Beans – Export",
  ],
  "oilseeds-and-nuts": [
    "Peanuts – Roasted",
    "Walnuts – Shelled",
    "Almonds – Raw",
    "Pumpkin Seeds",
  ],
  "herbs-and-spices": [
    "Basil – Fresh",
    "Rosemary – Bunch",
    "Rosemary – Fresh",
    "Rosemary – Organic",
    "Rosemary – Dried",
    "Rosemary – Sprigs",
    "Rosemary – Pot Grown",
    "Rosemary – Premium",
    "Rosemary – Local Farm",
    "Rosemary – Export Grade",
    "Rosemary – Cooking Bunch",
    "Rosemary – Large Bunch",
    "Rosemary – Small Pack",
    "Rosemary – Whole Plant",
    "Rosemary – Grade A",
    "Rosemary – New Season",
    "Thyme – Fresh",
    "Chilli – Red Fresh",
    "Lemongrass – Stalks",
    "Bay Leaves – Dried",
    "Cinnamon – Sticks",
    "Black Pepper – Ground",
    "Black Pepper – Whole",
    "Black Pepper – Coarse Ground",
    "Black Pepper – Fine Ground",
    "Black Pepper – Organic",
    "Black Pepper – Premium",
    "Black Pepper – Local Farm",
    "Black Pepper – Export Grade",
    "Black Pepper – Bulk 500g",
    "Black Pepper – Grade A",
  ],
  "chillies-and-peppers": [
    "Red Chillies",
    "Green Chillies",
    "Bird's Eye Chilli",
    "Thai Chilli",
    "Habanero",
    "Green Bell Pepper",
    "Red Bell Pepper",
    "Dried Red Chillies",
    "Chilli Powder",
    "Chilli Sauce",
    "Peri-Peri Sauce",
    "Jalapeño",
  ],
  "coffee-tea-cocoa": [
    "Instant Coffee – Jar",
    "Green Tea – Bags",
    "Hot Chocolate – Tin",
    "Espresso Beans – 1kg",
  ],
  "livestock-products": [
    "Beef Steak – Sirloin",
    "Pork Chops",
    "Beef Liver",
    "Sausages – Pork",
    "Bacon – Streaky",
    "Meat Mince – Mixed",
    "Lamb Chops",
    "Lamb Mince",
    "Lamb Leg",
    "Lamb Shoulder",
    "Lamb Ribs",
    "Lamb Stew Cuts",
    "Lamb Liver",
    "Lamb Shank",
    "Lamb Fillet",
    "Lamb Sausages",
    "Lamb – Farm Fresh",
    "Lamb Backstrap",
    "Lamb Curry Cut",
    "Lamb – Premium",
    "Smoked Lamb",
    "Lamb Bones",
  ],
  "poultry-products": [
    "Chicken Wings",
    "Chicken Thighs – Bone-in",
    "Chicken Drumsticks",
    "Duck – Whole",
    "Turkey – Breast",
    "Eggs – Free Range 12",
    "Gizzards – Cleaned",
  ],
  "fish-and-aquaculture": [
    "Catfish – Fresh",
    "Silver Fish – Dried",
    "Prawns – Medium",
    "Crayfish – Dried",
    "Mackerel – Fresh",
  ],
  "dairy-products": [
    "Cream – Fresh",
    "Cottage Cheese",
    "Mozzarella",
    "Ghee – Clarified",
  ],
  "export-fresh-produce": [
    "Export French Beans",
    "Export Chillies",
    "Export Passion Fruit",
    "Export Pineapple – Crownless",
  ],
};

function uniqueNames(names) {
  const seen = new Set();
  const out = [];
  for (const n of names) {
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out;
}

function genericVariants(categoryName, count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({
      name: `${categoryName} – Selection ${i + 1}`,
      unit: UNITS[i % UNITS.length],
    });
  }
  return out;
}

/**
 * @param {string} categoryId
 * @param {string} categoryName
 * @returns {{ name: string, unit: string }[]}
 */
export function getTemplatesForCategory(categoryId, categoryName) {
  const bulk = BULK_CATALOG.find((c) => c.id === categoryId);
  const fromBulk = (bulk?.items ?? []).map((item) => ({
    name: item.name,
    unit: item.unit ?? "each",
  }));
  const extras = (EXTRAS[categoryId] ?? []).map((name, i) => ({
    name,
    unit: UNITS[i % UNITS.length],
  }));

  let names = uniqueNames([...fromBulk.map((x) => x.name), ...extras.map((x) => x.name)]);

  const templates = [];
  const byName = new Map([...fromBulk, ...extras].map((x) => [x.name.toLowerCase(), x]));

  for (const name of names) {
    templates.push(byName.get(name.toLowerCase()) ?? { name, unit: "each" });
  }

  if (templates.length < MIN_PRODUCTS_PER_CATEGORY) {
    const need = MIN_PRODUCTS_PER_CATEGORY - templates.length;
    templates.push(...genericVariants(categoryName, need));
  }

  return templates.slice(0, Math.max(MIN_PRODUCTS_PER_CATEGORY, templates.length));
}

export function getAllCategoryTargets() {
  return AGRI_CATEGORIES.map((c) => ({
    id: c.id,
    name: c.name,
    templates: getTemplatesForCategory(c.id, c.name),
  }));
}
