export const KITCHEN_WARE_CATEGORY_ID = "kitchen-ware";

/** Shop aisles — matches the Kitchen Ware category grid. */
export const KITCHEN_WARE_AISLES = [
  {
    id: "cookware",
    title: "Cookware",
    icon: "🍳",
    color: "#8a8f98",
  },
  {
    id: "stainless-clad",
    title: "Stainless clad",
    icon: "🥄",
    color: "#9aa3ad",
  },
  {
    id: "carbon-steel",
    title: "Carbon steel",
    icon: "🔥",
    color: "#5c5c5c",
  },
  {
    id: "cast-iron",
    title: "Enamelled cast iron",
    icon: "🥘",
    color: "#8b3a2a",
  },
  {
    id: "non-stick",
    title: "Non-stick",
    icon: "🍳",
    color: "#3d4a5c",
  },
  {
    id: "cookware-accessories",
    title: "Cookware accessories",
    icon: "🧰",
    color: "#6d7a68",
  },
  {
    id: "tabletop",
    title: "Tabletop",
    icon: "🍽️",
    color: "#b7a99a",
  },
  {
    id: "knoxhult",
    title: "Modular kitchen units",
    icon: "🗄️",
    color: "#d9d2c5",
  },
  {
    id: "cabinets",
    title: "Cabinets, fronts and interiors",
    icon: "🚪",
    color: "#c4b7a6",
  },
  {
    id: "small-furniture",
    title: "Kitchen small furniture",
    icon: "🛒",
    color: "#4a6fa5",
  },
  {
    id: "extractor-hoods",
    title: "Extractor hoods",
    icon: "💨",
    color: "#6b7280",
  },
  {
    id: "countertops-sinks",
    title: "Countertops, faucets and sinks",
    icon: "🚰",
    color: "#7d8b95",
  },
  {
    id: "organization",
    title: "Organization in the kitchen",
    icon: "🧺",
    color: "#7a8f6e",
  },
];

/** Kitchen ware products grouped into the aisle categories above. */
export const KITCHEN_WARE_PRODUCTS = [
  // Cookware
  {
    id: "kitchen-cookware-01",
    aisleId: "cookware",
    name: "3-Piece Stainless Steel Pot Set",
    unit: "set",
    price: 185000,
    color: "#8a8f98",
    description:
      "Stainless steel saucepans with glass lids. Even heat for soups, sauces and everyday cooking.",
  },
  {
    id: "kitchen-cookware-02",
    aisleId: "cookware",
    name: "Non-Stick Frying Pan 28cm",
    unit: "each",
    price: 72000,
    color: "#4b5563",
    description:
      "Lightweight non-stick frying pan with stay-cool handle. Ideal for eggs, chapati and quick stir-fries.",
  },
  {
    id: "kitchen-cookware-03",
    aisleId: "cookware",
    name: "Cast Iron Dutch Oven 5L",
    unit: "each",
    price: 265000,
    color: "#6b3f2a",
    description:
      "Heavy-duty enamel cast iron pot for stews, matooke and slow Sunday cooking. Oven-safe lid included.",
  },

  // KNOXHULT — modular kitchen units
  {
    id: "kitchen-knoxhult-01",
    aisleId: "knoxhult",
    name: "KNOXHULT Base Cabinet With Doors",
    unit: "each",
    price: 420000,
    color: "#e8e2d6",
    description:
      "Compact modular base unit with soft-close doors. Sized for apartments and small home kitchens.",
  },
  {
    id: "kitchen-knoxhult-02",
    aisleId: "knoxhult",
    name: "KNOXHULT Wall Cabinet Pair",
    unit: "pair",
    price: 310000,
    color: "#d9d2c5",
    description:
      "Matching wall cabinets with adjustable shelves. Hang above the worktop for plates and dry goods.",
  },
  {
    id: "kitchen-knoxhult-03",
    aisleId: "knoxhult",
    name: "KNOXHULT Corner Base Unit",
    unit: "each",
    price: 495000,
    color: "#cfc7b8",
    description:
      "L-shaped modular corner cabinet that maximises awkward kitchen corners without custom carpentry.",
  },

  // Cabinets, fronts and interiors
  {
    id: "kitchen-cabinets-01",
    aisleId: "cabinets",
    name: "Drawer Front Set With Soft-Close Runners",
    unit: "set",
    price: 198000,
    color: "#c4b7a6",
    description:
      "Replace tired drawer fronts and runners. Soft-close hardware keeps interiors organised and quiet.",
  },
  {
    id: "kitchen-cabinets-02",
    aisleId: "cabinets",
    name: "Interior Cutlery Tray Insert",
    unit: "each",
    price: 45000,
    color: "#b8a999",
    description:
      "Fits standard drawers. Separate compartments for spoons, knives and serving tools.",
  },
  {
    id: "kitchen-cabinets-03",
    aisleId: "cabinets",
    name: "Pull-Out Pantry Basket Frame",
    unit: "each",
    price: 165000,
    color: "#9a8b7a",
    description:
      "Wire basket frame that slides out of a tall cabinet for oil, spices and tinned goods.",
  },

  // Kitchen small furniture
  {
    id: "kitchen-small-furniture-01",
    aisleId: "small-furniture",
    name: "3-Tier Rolling Mesh Utility Cart",
    unit: "each",
    price: 150000,
    color: "#4a6fa5",
    description:
      "Powder-coated steel cart with locking castors (50×35×76 cm). Move prep tools and produce around the kitchen.",
  },
  {
    id: "kitchen-small-furniture-02",
    aisleId: "small-furniture",
    name: "Bamboo Prep Cart On Castors",
    unit: "each",
    price: 244000,
    color: "#c4a574",
    description:
      "Solid bamboo prep top with lower storage (70×45×85 cm). Rolls from kitchen to outdoor table.",
  },
  {
    id: "kitchen-small-furniture-03",
    aisleId: "small-furniture",
    name: "2-Step Kitchen Stool With Handrail",
    unit: "each",
    price: 105000,
    color: "#5c6b73",
    description:
      "Stable folding stool for high cabinets. Non-slip treads; stores flat behind a door.",
  },

  // Extractor hoods
  {
    id: "kitchen-extractor-hoods-01",
    aisleId: "extractor-hoods",
    name: "Wall-Mount Stainless Extractor Hood 60cm",
    unit: "each",
    price: 380000,
    color: "#6b7280",
    description:
      "60cm stainless extractor with LED light and washable grease filters. Clears steam from charcoal and gas cooking.",
  },
  {
    id: "kitchen-extractor-hoods-02",
    aisleId: "extractor-hoods",
    name: "Slim Recirculating Hood 90cm",
    unit: "each",
    price: 455000,
    color: "#4b5563",
    description:
      "90cm recirculating hood for flats without an outdoor vent. Carbon filter pack included.",
  },

  // Countertops, faucets and sinks
  {
    id: "kitchen-countertops-sinks-01",
    aisleId: "countertops-sinks",
    name: "Single Bowl Stainless Kitchen Sink",
    unit: "each",
    price: 220000,
    color: "#7d8b95",
    description:
      "Deep single-bowl sink with drain kit. Fits standard cabinet cut-outs for quick kitchen upgrades.",
  },
  {
    id: "kitchen-countertops-sinks-02",
    aisleId: "countertops-sinks",
    name: "Chrome Mixer Kitchen Faucet",
    unit: "each",
    price: 98000,
    color: "#94a3b8",
    description:
      "Swivel-spout mixer tap with ceramic cartridge. Easy install for kitchen and laundry sinks.",
  },
  {
    id: "kitchen-countertops-sinks-03",
    aisleId: "countertops-sinks",
    name: "Laminate Worktop Board 180cm",
    unit: "each",
    price: 175000,
    color: "#a8a29e",
    description:
      "Ready-cut laminate worktop (180×60 cm). Wipe-clean surface for prep without a full renovation.",
  },

  // Organization in the kitchen
  {
    id: "kitchen-organization-01",
    aisleId: "organization",
    name: "Wall Rail Shelf Set With Hooks",
    unit: "set",
    price: 83000,
    color: "#7a8f6e",
    description:
      "Steel rail, pine shelves and S-hooks. Hang utensils and free cupboard space above the worktop.",
  },
  {
    id: "kitchen-organization-02",
    aisleId: "organization",
    name: "Slim Pantry Roll-Out Cart",
    unit: "each",
    price: 158000,
    color: "#3d5a80",
    description:
      "Four mesh baskets that slide into the gap next to a fridge for dry goods and bottles.",
  },
  {
    id: "kitchen-organization-03",
    aisleId: "organization",
    name: "Freestanding Dish Drying Tower",
    unit: "each",
    price: 143000,
    color: "#577590",
    description:
      "Vertical drying tower with drip trays. Keep plates and bowls off the crowded counter.",
  },
  {
    id: "kitchen-organization-04",
    aisleId: "organization",
    name: "Under-Sink Storage Frame",
    unit: "each",
    price: 75000,
    color: "#2f4858",
    description:
      "Adjustable steel frame with sliding trays for detergents and bins under the sink.",
  },
];
