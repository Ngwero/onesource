/**
 * Fix products.byId structure, add missing EN keys, sync all locales from EN (preserve existing translations).
 * Run: node scripts/i18n-expand.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, "../src/i18n/locales");

const CATALOGUE_KEYS = {
  catalogue: "Product catalogue",
  allTitle: "All agricultural products",
  allSubtitle: "Browse {{count}} products across every category",
  categorySubtitle: "{{count}} products in {{category}}",
  emptyCategory: "No products in this category yet. Try another filter.",
  showAll: "Show all products",
  showing: "Showing {{count}} products",
  viewCatalogue: "View full catalogue",
};

const EXTRA_EN = {
  common: {
    close: "Close",
    loading: "Loading…",
    retry: "Retry",
  },
  errors: {
    loadProducts:
      "Could not load products. Check server/.env (Supabase) and run: cd server && npm run dev",
    loadProduct: "Failed to load product",
    loadProductsApi: "Failed to load products",
    loadRates: "Failed to load rates",
    loadOrders: "Failed to load orders",
    loadOrder: "Failed to load order",
    signInFailed: "Sign in failed",
    signUpFailed: "Sign up failed",
    supabaseNotConfigured:
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to a .env file in the project root.",
  },
  shop: {
    loading: "Loading fresh produce…",
    unavailable: "Shop unavailable",
    setupHint:
      "Configure Supabase in server/.env, then run cd server && npm run dev",
  },
  orders: {
    title: "Your orders",
  },
  productCard: {
    rrp: "RRP",
    freeDelivery: "FREE same-day",
    getIt: "Get it",
    viewedPastMonth: "{{count}}+ viewed in past month",
    boughtPastMonth: "{{count}}+ bought in past month",
    boughtPastMonthK: "{{count}}K+ bought in past month",
    bestSeller: "Best Seller",
    bestSellerTop: "#1 Best Seller",
    unitPrice: "({{price}} / {{unit}})",
  },
  productDetails: {
    labels: {
      itemForm: "Item form",
      brand: "Brand",
      brandName: "Brand name",
      category: "Category",
      countryOfOrigin: "Country of origin",
      itemWeight: "Item weight",
      numberOfItems: "Number of items",
      unitCount: "Unit count",
      temperatureCondition: "Temperature condition",
      specialty: "Specialty",
      cuisine: "Cuisine",
      bestSellersRank: "Best Sellers Rank",
      produceSoldAs: "Produce sold as",
      productId: "Product ID",
      customerReviews: "Customer reviews",
      unitOfSale: "Unit of sale",
      price: "Price",
      size: "Size",
      stock: "Stock",
      productName: "Product name",
      storage: "Storage",
      delivery: "Delivery",
      primeEligible: "Prime eligible",
      condition: "Condition",
    },
    values: {
      yes: "Yes",
      no: "No",
      loose: "Loose",
      fresh: "Fresh",
      chilled: "Chilled",
      new: "New",
      vegetarian: "Vegetarian",
      african: "African",
      oneSource: "One Source",
      standardDelivery: "Standard delivery",
      oneUnit: "1 unit",
      packOfOne: "{{weight}} (Pack of 1)",
      stockAvailable: "{{count}} available",
      reviewsSummary: "{{rating}} out of 5 ({{count}} ratings)",
      kilograms: "Kilograms",
      approxWeight: "{{weight}} (approx)",
      soldUnit: "Sold {{unit}}",
      rankInCategory: "{{rank}} in {{category}}",
    },
    origin: {
      uganda: "Uganda",
      ugandaExport: "Uganda (export grade)",
      ghana: "Ghana",
    },
    forms: {
      yam: "Yam",
      chilliPepper: "Chilli pepper",
      fish: "Fish",
      poultry: "Poultry",
      freshProduce: "Fresh produce",
    },
    ingredients: {
      sauce: "{{name}} (chilli peppers, salt, vinegar, oil, spices). See pack for allergens.",
      yam: "{{name}} ({{origin}})",
      tuber: "100% {{name}} ({{origin}}). No additives.",
      chilli: "100% fresh {{name}} ({{origin}})",
      default: "100% fresh {{name}} ({{origin}}). Farm-sourced.",
    },
    storage: {
      coolDry: "Cool, dry place or refrigerate.",
      roots: "Cool, dark, ventilated place. Use within 2 weeks.",
      chilled: "Refrigerate 0–4°C. Use by date on pack.",
      default: "Follow pack instructions.",
    },
    about: {
      productOf: "{{name}} — product of {{origin}}",
      yam1: "White yams are a staple across Africa and the Caribbean — starchy tubers with brown skin and white flesh.",
      yam2: "Boil, fry, or roast. Popular as pounded yam or fufu with soups and stews.",
      yam3: "Any problems with perishable products must be reported within 24 hours of delivery.",
      chilli1: "Fresh hot peppers — ideal for sauces, marinades, and traditional dishes.",
      chilli2: "Store in a cool place or refrigerate to maintain freshness.",
      chilli3: "Report quality issues within 24 hours of delivery.",
      freshCategory: "Fresh {{category}} from Ugandan farms and cooperatives.",
      report24h: "Report perishable quality issues within 24 hours of delivery.",
      primeEligible: "Prime eligible — same-day delivery on qualifying orders.",
    },
    description: {
      intro: "{{name}} ({{origin}})",
      farmFresh: "Farm-fresh {{name}} supplied through One Source Uganda.",
      yam1: "Fresh white yam with brown tough skin and white starchy flesh. Grown in fertile soils and selected for cooking quality.",
      yam2: "Cook boiled, fried, or roasted. A main ingredient in fufu, pounded yam, and many African dishes.",
      yam3: "Product of {{origin}}. Report delivery issues with perishables within 24 hours.",
    },
    social: {
      viewedPastMonth: "{{count}}+ viewed in past month",
      boughtPastMonth: "{{count}}+ bought in past month",
      boughtPastMonthK: "{{count}}K+ bought in past month",
    },
    customersSay: {
      freshQuality: "Customers find it fresh and good quality",
      mixedQuality: "Customers have mixed opinions on quality",
      concerns: "Some customers report quality concerns",
      yamNote: "— freshness and size vary by delivery",
      chilliNote: "— heat level and ripeness are as expected for the variety",
      defaultNote: "— value and packaging receive mixed feedback",
    },
    warranty: {
      p1: "Fresh produce is covered by our freshness guarantee. Contact customer service within 24 hours of delivery if items arrive damaged or below quality — include photos where possible.",
      p2: "Refunds or replacements are issued at One Source Uganda's discretion in line with our returns policy.",
      p3: "Regardless of statutory rights, many products qualify for return within 30 days where applicable. See return details for exceptions.",
    },
    breadcrumbs: {
      grocery: "Grocery",
      freshChilled: "Fresh & Chilled",
      freshVegetables: "Fresh Vegetables",
      yams: "Yams",
      chilliesPeppers: "Chillies & Peppers",
    },
  },
};

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Fill missing keys from master; keep locale values where present. */
function mergeLocales(master, locale) {
  if (Array.isArray(master)) {
    if (Array.isArray(locale) && locale.length > 0) return locale;
    return master;
  }
  if (!isPlainObject(master)) {
    return locale !== undefined && locale !== null ? locale : master;
  }
  const out = {};
  for (const key of Object.keys(master)) {
    const m = master[key];
    const l = locale?.[key];
    if (isPlainObject(m)) {
      out[key] = mergeLocales(m, isPlainObject(l) ? l : undefined);
    } else if (Array.isArray(m)) {
      out[key] = mergeLocales(m, l);
    } else {
      out[key] = l !== undefined && l !== null && l !== "" ? l : m;
    }
  }
  return out;
}

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (isPlainObject(source[key]) && isPlainObject(target[key])) {
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

function fixProductsStructure(data) {
  const products = data.products ?? {};
  const byId = {};
  const catalogue = { ...CATALOGUE_KEYS };

  for (const [k, v] of Object.entries(products)) {
    if (/^\d+$/.test(k)) byId[k] = v;
    else if (!(k in catalogue)) catalogue[k] = v;
    else if (k !== "byId") catalogue[k] = v;
  }

  if (products.byId && isPlainObject(products.byId)) {
    Object.assign(byId, products.byId);
  }

  data.products = { ...catalogue, byId };
}

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function saveJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

const enPath = path.join(localesDir, "en.json");
const en = loadJson(enPath);
fixProductsStructure(en);
deepMerge(en, EXTRA_EN);
saveJson(enPath, en);
console.log("Updated en.json");

for (const code of ["fr", "ln", "rw"]) {
  const file = path.join(localesDir, `${code}.json`);
  const locale = fs.existsSync(file) ? loadJson(file) : {};
  fixProductsStructure(locale);
  const merged = mergeLocales(en, locale);
  saveJson(file, merged);
  console.log(`Synced ${code}.json`);
}

console.log("Done.");
