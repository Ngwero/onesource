/** Kitchen Ware aisle definitions — keep titles in sync with server/data/kitchenWareCatalog.js */
export const KITCHEN_WARE_CATEGORY_ID = "kitchen-ware";

export const KITCHEN_WARE_AISLES = [
  { id: "cookware", title: "Cookware", icon: "🍳", accent: "#8a8f98" },
  {
    id: "stainless-clad",
    title: "Stainless clad",
    icon: "🥄",
    accent: "#9aa3ad",
  },
  {
    id: "carbon-steel",
    title: "Carbon steel",
    icon: "🔥",
    accent: "#5c5c5c",
  },
  {
    id: "cast-iron",
    title: "Enamelled cast iron",
    icon: "🥘",
    accent: "#8b3a2a",
  },
  {
    id: "non-stick",
    title: "Non-stick",
    icon: "🍳",
    accent: "#3d4a5c",
  },
  {
    id: "cookware-accessories",
    title: "Cookware accessories",
    icon: "🧰",
    accent: "#6d7a68",
  },
  {
    id: "tabletop",
    title: "Tabletop",
    icon: "🍽️",
    accent: "#b7a99a",
  },
  {
    id: "knoxhult",
    title: "Modular kitchen units",
    icon: "🗄️",
    accent: "#d9d2c5",
  },
  {
    id: "cabinets",
    title: "Cabinets, fronts and interiors",
    icon: "🚪",
    accent: "#c4b7a6",
  },
  {
    id: "small-furniture",
    title: "Kitchen small furniture",
    icon: "🛒",
    accent: "#4a6fa5",
  },
  {
    id: "extractor-hoods",
    title: "Extractor hoods",
    icon: "💨",
    accent: "#6b7280",
  },
  {
    id: "countertops-sinks",
    title: "Countertops, faucets and sinks",
    icon: "🚰",
    accent: "#7d8b95",
  },
  {
    id: "organization",
    title: "Organization in the kitchen",
    icon: "🧺",
    accent: "#7a8f6e",
  },
] as const;

export type KitchenAisleId = (typeof KITCHEN_WARE_AISLES)[number]["id"];

export function aisleIdFromProductId(productId: string): KitchenAisleId | null {
  const ordered = [...KITCHEN_WARE_AISLES].sort(
    (a, b) => b.id.length - a.id.length
  );
  const match = ordered.find((aisle) =>
    productId.startsWith(`kitchen-${aisle.id}-`)
  );
  return match?.id ?? null;
}

export function aisleTitleFromProductId(productId: string): string {
  const id = aisleIdFromProductId(productId);
  return (
    KITCHEN_WARE_AISLES.find((aisle) => aisle.id === id)?.title ??
    "Organization in the kitchen"
  );
}

const SERIES_PREFIX =
  /^[A-ZÄÖÅÉÜÁÍÓÚÑ0-9][A-ZÄÖÅÉÜÁÍÓÚÑ0-9\-]{2,}(?:\s+[A-ZÄÖÅÉÜÁÍÓÚÑ0-9][A-ZÄÖÅÉÜÁÍÓÚÑ0-9\-]{2,})?\s+/u;

/** Turn IKEA-style "SERIES fact dump" into everyday product names. */
export function humanizeKitchenTitle(rawTitle: string): string {
  let t = String(rawTitle ?? "")
    .replace(/\s*[–—-]\s*One Source\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  // Drop leading ALL-CAPS series codes (FINMAT, SEKTION MAXIMERA, HJÄLTE, …)
  for (let i = 0; i < 3; i += 1) {
    const next = t.replace(SERIES_PREFIX, "");
    if (next === t) break;
    t = next;
  }

  const replacements: Array<[RegExp, string]> = [
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
    [/colour/gi, "colour"],
    [/\s+,/g, ","],
    [/,\s*/g, ", "],
    [/\s+/g, " "],
  ];

  for (const [pattern, replacement] of replacements) {
    t = t.replace(pattern, replacement);
  }

  t = t.trim().replace(/^,\s*|,\s*$/g, "");
  if (!t) return "Kitchen item";
  // Undo over-eager modular prefixes on ordinary "Kitchen …" products
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

/**
 * Split a human kitchen title for card/PDP display.
 * Prefers "Name" + "colour / size detail" when a comma is present.
 */
export function parseKitchenListingTitle(title: string): {
  series: string;
  facts: string;
} {
  const human = humanizeKitchenTitle(title);
  const comma = human.indexOf(",");
  if (comma > 0 && comma < human.length - 1) {
    return {
      series: human.slice(0, comma).trim(),
      facts: human.slice(comma + 1).trim(),
    };
  }

  // Split after a short product noun phrase when no comma
  const words = human.split(" ");
  if (words.length > 5) {
    return {
      series: words.slice(0, 4).join(" "),
      facts: words.slice(4).join(" "),
    };
  }

  return { series: human, facts: "" };
}
