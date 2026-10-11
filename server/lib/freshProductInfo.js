/**
 * Product information for Fresh listings: storage, preparation, nutrition
 * highlights, allergens and safety advice, keyed by product type.
 *
 * Only single-ingredient produce, meat, fish, eggs, grains and pulses get
 * generated information. Multi-ingredient, branded or chemical products
 * (kind "label") need the manufacturer's label and stay unpublished until it is
 * entered in the admin — ingredients and allergens must never be guessed.
 *
 * Allergen names follow the 14 major allergens (UK/EU FIC, aligned with Codex).
 */

const CHILLED_RAW_MEAT = [
  "Raw meat: keep separate from ready-to-eat foods and wash hands, knives and boards after handling.",
  "Cook thoroughly until the juices run clear and there is no pink meat in minced or rolled cuts.",
];

const T = {
  citrus: {
    form: "Fresh citrus fruit",
    storage: "Store in a cool, airy place for up to a week, or in the fridge for up to 3 weeks.",
    howToUse: "Wash before use. Peel and eat in segments, juice for drinks and dressings, or grate the washed zest into baking and marinades.",
    highlights: ["Naturally rich in vitamin C", "No added sugar or preservatives"],
  },
  grapefruit: {
    form: "Fresh citrus fruit",
    storage: "Store in a cool, airy place for up to a week, or in the fridge for up to 3 weeks.",
    howToUse: "Wash, halve and segment with a small knife, or peel and eat in segments. Also good juiced.",
    highlights: ["Rich in vitamin C", "Refreshing, tangy flavour"],
    warnings: [
      "Grapefruit can interact with some medicines (including certain statins and blood-pressure drugs). If you take regular medication, check with your doctor or pharmacist before eating it.",
    ],
  },
  mango: {
    form: "Fresh mango",
    storage: "Ripen at room temperature until the fruit gives slightly when pressed, then keep in the fridge and eat within 3–4 days.",
    howToUse: "Wash, slice the two cheeks off either side of the flat stone, score the flesh and scoop out. Eat fresh, blend into juice or add to salads.",
    highlights: ["Source of vitamins A and C", "Naturally sweet with no added sugar"],
    warnings: ["Mango skin and sap can irritate sensitive skin and lips. Peel before eating if you react."],
  },
  cutFruit: {
    form: "Freshly cut fruit",
    storage: "Keep refrigerated at 0–5 °C and eat within 24 hours of delivery.",
    howToUse: "Ready to eat. Serve chilled on its own, in fruit salads or blended into smoothies.",
    highlights: ["Prepared fresh for convenience", "No added sugar"],
  },
  pineapple: {
    form: "Fresh pineapple",
    storage: "Keep whole pineapples at room temperature for 1–2 days; once cut, refrigerate in a covered container and eat within 3 days.",
    howToUse: "Cut off the crown and base, slice away the skin and remove the tough core. Eat fresh, grill, or blend into juice.",
    highlights: ["Source of vitamin C and manganese", "Contains the natural enzyme bromelain"],
    warnings: ["Fresh pineapple can cause a tingling feeling in the mouth in some people."],
  },
  banana: {
    form: "Fresh bananas",
    storage: "Keep at room temperature away from other fruit; refrigerate once ripe to slow further ripening (the skin darkens but the fruit stays good).",
    howToUse: "Peel and eat, slice onto porridge or cereal, or mash into baking and smoothies.",
    highlights: ["Source of potassium and vitamin B6", "Natural energy snack"],
    allergenNote: "People with a latex allergy can react to banana.",
  },
  matooke: {
    form: "Fresh green cooking bananas (matooke)",
    storage: "Store in a cool, shaded place and cook within 3–5 days, before the fruit turns yellow.",
    howToUse: "Peel (oil your hands or wear gloves to avoid the sticky sap), wrap in banana leaves and steam for about 1 hour until soft, then mash. Also good boiled in stews.",
    highlights: ["Ugandan staple carbohydrate", "Source of potassium and fibre"],
    allergenNote: "People with a latex allergy can react to banana.",
  },
  avocado: {
    form: "Fresh avocado",
    storage: "Ripen at room temperature until the flesh yields to gentle pressure, then refrigerate and eat within 2–3 days.",
    howToUse: "Halve, remove the stone and scoop out the flesh. Slice into salads, mash onto toast or blend into guacamole; add lemon juice to stop browning.",
    highlights: ["Rich in monounsaturated fats", "Source of fibre, folate and potassium"],
    allergenNote: "People with a latex allergy can react to avocado.",
  },
  frozenAvocado: {
    form: "Frozen avocado",
    temperature: "Frozen",
    storage: "Keep frozen at −18 °C or below. Once thawed, keep in the fridge and use within 24 hours. Do not refreeze.",
    howToUse: "Thaw in the fridge or use straight from frozen in smoothies, dips and guacamole.",
    highlights: ["Ready-prepared avocado", "No added ingredients"],
    allergenNote: "People with a latex allergy can react to avocado.",
  },
  avocadoOil: {
    form: "Avocado oil",
    ingredients: "Avocado oil.",
    storage: "Store in a cool, dark cupboard with the cap closed. Use within 6 months of opening.",
    howToUse: "Suitable for frying, roasting and dressings. It has a high smoke point and a mild flavour.",
    highlights: ["Rich in monounsaturated fats", "High smoke point for cooking"],
    temperature: "Ambient",
  },
  passion: {
    form: "Fresh passion fruit",
    storage: "Keep at room temperature until the skin wrinkles slightly, then refrigerate for up to a week.",
    howToUse: "Wash, cut in half and scoop out the pulp and seeds. Eat fresh, stir into yoghurt or strain for juice.",
    highlights: ["Source of vitamin C and fibre", "Intense sweet-sour flavour"],
  },
  papaya: {
    form: "Fresh papaya (paw paw)",
    storage: "Ripen at room temperature until mostly yellow, then refrigerate and eat within 3 days.",
    howToUse: "Halve, scoop out the black seeds and peel. Eat fresh with a squeeze of lime or blend into juice.",
    highlights: ["Rich in vitamin C and vitamin A", "Contains the natural enzyme papain"],
    allergenNote: "People with a latex allergy can react to papaya.",
  },
  watermelon: {
    form: "Fresh watermelon",
    storage: "Keep whole melons in a cool place for up to a week. Once cut, cover and refrigerate; eat within 3 days.",
    howToUse: "Wash the rind before cutting. Slice into wedges or cubes and serve chilled, or blend into juice.",
    highlights: ["About 90% water — very hydrating", "Source of vitamin C"],
  },
  jackfruit: {
    form: "Fresh jackfruit",
    storage: "Keep whole fruit at room temperature until it smells sweet. Refrigerate cut pieces in a covered container for up to 5 days.",
    howToUse: "Oil your knife and hands (the sap is very sticky), cut into sections and remove the yellow pods. Eat ripe pods fresh; remove the seeds, which must be boiled or roasted before eating.",
    highlights: ["Source of vitamin C and potassium", "Naturally sweet tropical fruit"],
    warnings: ["Jackfruit seeds must be cooked before eating."],
  },
  berries: {
    form: "Fresh berries",
    storage: "Keep refrigerated and eat within 2–3 days. Wash just before eating.",
    howToUse: "Rinse gently and eat fresh, or add to cereal, yoghurt, desserts and smoothies.",
    highlights: ["Source of vitamin C and antioxidants", "No added sugar"],
  },
  apple: {
    form: "Fresh apples",
    storage: "Store in the fridge for up to 4 weeks, away from strong-smelling foods.",
    howToUse: "Wash and eat whole, slice into salads, or bake into crumbles and pies.",
    highlights: ["Source of fibre and vitamin C", "Crisp, naturally sweet"],
  },
  pear: {
    form: "Fresh pears",
    storage: "Ripen at room temperature, then refrigerate and eat within 3–5 days.",
    howToUse: "Wash and eat whole, slice into salads, or poach and bake.",
    highlights: ["Source of fibre and vitamin C"],
  },
  sugarcane: {
    form: "Fresh sugarcane",
    storage: "Keep in a cool, dry place and eat within 5 days. Wrap cut pieces and refrigerate.",
    howToUse: "Peel the hard outer bark with a sharp knife, cut into sticks and chew to release the juice; discard the fibre.",
    highlights: ["Natural sweet snack"],
    warnings: ["Supervise young children: the fibres are hard to chew and can be a choking hazard."],
  },

  tomato: {
    form: "Fresh tomatoes",
    storage: "Keep at room temperature out of direct sunlight for the best flavour; refrigerate once fully ripe and use within 5 days.",
    howToUse: "Wash before use. Slice into salads and sandwiches, or cook into sauces, stews and soups.",
    highlights: ["Source of vitamin C and lycopene"],
  },
  carrot: {
    form: "Fresh carrots",
    storage: "Store in the fridge salad drawer for up to 2 weeks.",
    howToUse: "Wash or peel. Eat raw, grate into salads, or boil, steam and roast.",
    highlights: ["Rich in beta-carotene (vitamin A)", "Source of fibre"],
  },
  leafy: {
    form: "Fresh leafy greens",
    storage: "Keep refrigerated in a loosely closed bag and use within 2–3 days.",
    howToUse: "Remove any tough stems, wash thoroughly in clean water and drain. Steam, stir-fry or add to stews; tender leaves can be eaten raw in salads.",
    highlights: ["Source of iron, folate and vitamin K", "Low in calories"],
  },
  salad: {
    form: "Fresh salad leaves",
    storage: "Keep refrigerated at 0–5 °C and use within 2 days.",
    howToUse: "Wash thoroughly in clean water, dry and serve with your favourite dressing.",
    highlights: ["Low in calories", "Source of vitamin K and folate"],
  },
  bitterGreens: {
    form: "Fresh leafy greens",
    storage: "Keep refrigerated in a loosely closed bag and use within 2–3 days.",
    howToUse: "Pick the leaves from the stems, wash well and boil or steam. Traditionally cooked with groundnut paste or milk to soften the bitterness.",
    highlights: ["Traditional Ugandan green vegetable", "Source of iron and vitamins"],
  },
  courgette: {
    form: "Fresh courgettes",
    storage: "Keep refrigerated and use within 5 days.",
    howToUse: "Wash and trim the ends. Slice and fry, grill or roast, or grate raw into salads.",
    highlights: ["Low in calories", "Source of vitamin C and potassium"],
  },
  sweetcorn: {
    form: "Fresh sweetcorn",
    storage: "Keep refrigerated in the husk and cook within 2 days for the sweetest flavour.",
    howToUse: "Remove the husk and silk, then boil for 5–8 minutes, grill or roast until tender.",
    highlights: ["Source of fibre", "Naturally sweet"],
  },
  broccoli: {
    form: "Fresh broccoli",
    storage: "Keep refrigerated and use within 4 days.",
    howToUse: "Cut into florets and wash. Steam for 4–5 minutes, stir-fry or roast.",
    highlights: ["Source of vitamin C and vitamin K", "Source of fibre"],
  },
  pepper: {
    form: "Fresh sweet peppers",
    storage: "Keep refrigerated and use within a week.",
    howToUse: "Wash, halve and remove the seeds. Slice raw into salads or roast, grill and stir-fry.",
    highlights: ["Rich in vitamin C", "Mild and sweet — not spicy"],
  },
  peas: {
    form: "Fresh pea pods",
    storage: "Keep refrigerated and use within 3 days.",
    howToUse: "Wash and trim the ends. Eat raw, or steam or stir-fry for 2–3 minutes so they stay crisp.",
    highlights: ["Source of vitamin C and fibre", "Edible pods"],
  },
  greenBeans: {
    form: "Fresh green beans",
    storage: "Keep refrigerated and use within 4 days.",
    howToUse: "Wash and trim the ends. Boil or steam for 4–6 minutes, or stir-fry.",
    highlights: ["Source of fibre and vitamin C", "Low in calories"],
  },
  broadBeans: {
    form: "Fresh broad beans",
    storage: "Keep refrigerated in their pods and use within 3 days.",
    howToUse: "Pod the beans and boil for 3–5 minutes. For a tender finish, slip off the pale outer skins after cooking.",
    highlights: ["Source of protein and fibre"],
    warnings: [
      "Broad beans can cause a serious reaction (favism) in people with G6PD deficiency. Do not eat them if you have this condition.",
    ],
  },
  cabbage: {
    form: "Fresh cabbage",
    storage: "Keep refrigerated for up to 2 weeks; wrap cut cabbage and use within 3 days.",
    howToUse: "Remove the outer leaves, wash and shred. Eat raw in coleslaw or stir-fry, steam and add to stews.",
    highlights: ["Source of vitamin C and vitamin K"],
  },
  gardenEggs: {
    form: "Fresh garden eggs (African aubergine)",
    storage: "Keep in a cool place or the fridge and use within 5 days.",
    howToUse: "Wash and trim the stalk. Boil, steam or fry, or add to stews and sauces.",
    highlights: ["Source of fibre", "Traditional African vegetable"],
  },
  onion: {
    form: "Fresh onions",
    storage: "Store whole onions in a cool, dry, well-ventilated place for up to a month. Wrap cut onions and refrigerate for up to 3 days.",
    howToUse: "Peel and chop or slice. The base of countless stews, sauces and salads; fry gently until soft and golden.",
    highlights: ["Adds depth of flavour to cooking"],
  },
  garlic: {
    form: "Fresh garlic",
    storage: "Store in a cool, dry, airy place for up to 2 months. Do not refrigerate whole bulbs.",
    howToUse: "Separate the cloves, peel and crush, chop or slice. Fry gently — burnt garlic tastes bitter.",
    highlights: ["Strong aromatic flavour"],
  },
  ginger: {
    form: "Fresh ginger root",
    storage: "Keep in the fridge for up to 3 weeks, or freeze and grate from frozen.",
    howToUse: "Peel with the edge of a spoon, then grate, slice or crush into tea, stews, stir-fries and marinades.",
    highlights: ["Warming, spicy flavour", "Popular in tea and cooking"],
  },
  herb: {
    form: "Fresh herbs",
    storage: "Stand the stems in a glass of water in the fridge, loosely covered, and use within 5 days.",
    howToUse: "Rinse, shake dry and pick the leaves. Chop and add at the end of cooking, or use raw in salads and garnishes.",
    highlights: ["Fresh, aromatic flavour"],
  },
  driedSpice: {
    form: "Dried spice",
    storage: "Store in an airtight container in a cool, dry, dark place. Best used within 12 months.",
    howToUse: "Add to curries, stews, marinades and rubs to taste.",
    highlights: ["Single-ingredient spice"],
  },
  turmeric: {
    form: "Turmeric",
    storage: "Store fresh roots in the fridge for up to 3 weeks; store dried turmeric in an airtight container in a cool, dark place.",
    howToUse: "Peel and grate fresh root, or use dried into curries, rice, tea and marinades. It stains hands and fabric yellow.",
    highlights: ["Bright colour and earthy flavour"],
  },
  beetroot: {
    form: "Fresh beetroot",
    storage: "Remove the leaves and keep refrigerated for up to 2 weeks.",
    howToUse: "Wash, then boil whole for 30–60 minutes or roast until tender; peel once cooled. Can also be grated raw into salads.",
    highlights: ["Source of folate and fibre"],
    allergenNote: "Beetroot can turn urine and stools pink or red — this is harmless.",
  },
  potato: {
    form: "Fresh potatoes",
    storage: "Store in a cool, dark, dry place (not the fridge) for up to 2 weeks.",
    howToUse: "Scrub or peel, then boil, mash, roast, bake or fry.",
    highlights: ["Source of vitamin C and potassium", "Versatile staple"],
    warnings: ["Cut away any green parts or sprouts before cooking, and do not eat potatoes that have turned green."],
  },
  sweetPotato: {
    form: "Fresh sweet potatoes",
    storage: "Store in a cool, dark, dry place for up to 2 weeks. Do not refrigerate raw.",
    howToUse: "Scrub or peel, then boil, steam, roast or bake until tender.",
    highlights: ["Rich in beta-carotene (vitamin A)", "Source of fibre"],
  },
  cassava: {
    form: "Fresh cassava",
    storage: "Cook within 2 days of delivery — fresh cassava spoils quickly. Peeled cassava can be kept under water in the fridge for 1–2 days, or frozen.",
    howToUse: "Peel off the thick skin completely, cut out the woody core, then boil for 20–30 minutes until soft. Discard the cooking water. Serve boiled, mashed or fried.",
    highlights: ["Staple source of energy", "Naturally gluten-free"],
    warnings: [
      "Never eat cassava raw. It contains natural compounds that release cyanide; peeling and thorough cooking make it safe.",
    ],
  },
  cassavaFlour: {
    form: "Cassava flour",
    ingredients: "Cassava flour.",
    temperature: "Ambient",
    storage: "Store in an airtight container in a cool, dry place.",
    howToUse: "Mix with boiling water and stir until smooth to make kalo or ugali, or use as a gluten-free flour in baking.",
    highlights: ["Naturally gluten-free"],
    warnings: ["Cook before eating — do not eat raw flour."],
  },
  yam: {
    form: "Fresh yams",
    storage: "Store in a cool, dark, well-ventilated place for up to 2 weeks. Do not refrigerate.",
    howToUse: "Peel (wear gloves if your skin is sensitive), cut into pieces and boil for 20–25 minutes until tender. Serve boiled, mashed or fried.",
    highlights: ["Filling staple carbohydrate", "Source of potassium and fibre"],
    warnings: ["Always cook yams before eating — raw yam can be harmful.", "Raw yam can make hands itch; wear gloves when peeling."],
  },

  freshChilli: {
    form: "Fresh chillies",
    storage: "Keep refrigerated in a paper bag and use within 1–2 weeks, or freeze whole.",
    howToUse: "Wash, remove the stalk and slice. Remove the seeds and white membrane for a milder heat. Use sparingly in stews, sauces and marinades.",
    highlights: ["Adds heat and flavour", "Source of vitamin C"],
    warnings: [
      "Very hot: wear gloves or wash hands thoroughly after handling, and keep away from eyes and children.",
    ],
  },
  driedChilli: {
    form: "Dried chillies",
    storage: "Store in an airtight container in a cool, dry, dark place for up to 12 months.",
    howToUse: "Use whole in stews and oils, or crush and grind. Toast briefly in a dry pan to deepen the flavour.",
    highlights: ["Long-lasting heat and flavour"],
    warnings: [
      "Very hot: wash hands after handling, keep away from eyes and children, and avoid inhaling the dust when grinding.",
    ],
  },
  chilliGround: {
    form: "Ground chilli",
    storage: "Store in an airtight container in a cool, dry, dark place. Best used within 12 months.",
    howToUse: "Add a small amount to stews, sauces and marinades and adjust to taste.",
    highlights: ["Adds heat and colour"],
    warnings: ["Very hot: keep away from eyes and children and avoid inhaling the powder."],
  },

  fishFresh: {
    form: "Fresh fish",
    temperature: "Chilled",
    allergens: ["Fish"],
    storage: "Keep refrigerated at 0–4 °C and cook within 1 day of delivery, or freeze on the day of delivery and use within 3 months.",
    howToUse: "Rinse and pat dry. Fry, grill, steam or stew until the flesh is opaque and flakes easily (core temperature 63 °C).",
    highlights: ["High in protein", "Source of omega-3 fats and vitamin D"],
    warnings: ["May contain bones.", "Raw fish: keep separate from ready-to-eat foods and wash hands after handling."],
  },
  mackerel: {
    form: "Fresh mackerel",
    temperature: "Chilled",
    allergens: ["Fish"],
    storage: "Keep refrigerated at 0–4 °C and cook on the day of delivery, or freeze immediately.",
    howToUse: "Gut and rinse if whole, then grill, bake or fry until the flesh is opaque and flakes easily.",
    highlights: ["Rich in omega-3 fats", "High in protein"],
    warnings: [
      "Mackerel must be kept cold at all times: if left warm it can build up histamine, which cooking does not destroy.",
      "May contain bones.",
    ],
  },
  fishPreserved: {
    form: "Smoked or dried fish",
    temperature: "Ambient",
    allergens: ["Fish"],
    storage: "Store in a cool, dry place in a sealed container. Refrigerate in hot weather and use within 2 weeks.",
    howToUse: "Soak in warm water for 15–30 minutes to soften and reduce saltiness, rinse, then add to stews, sauces and groundnut soups.",
    highlights: ["High in protein", "Traditional preserved fish"],
    warnings: ["May contain bones.", "High in salt."],
  },
  silverfish: {
    form: "Dried silverfish (mukene)",
    temperature: "Ambient",
    allergens: ["Fish"],
    storage: "Store in an airtight container in a cool, dry place.",
    howToUse: "Pick through and rinse well to remove sand, then fry or add to stews and sauces.",
    highlights: ["High in protein and calcium (eaten whole)"],
  },

  beef: { form: "Fresh beef", meat: true },
  goat: { form: "Fresh goat meat", meat: true },
  lamb: { form: "Fresh lamb", meat: true },
  pork: {
    form: "Fresh pork",
    meat: true,
    extraWarnings: ["Pork must be cooked all the way through (core temperature 71 °C) with no pink meat."],
  },
  mince: {
    form: "Fresh mince",
    meat: true,
    extraWarnings: ["Mince must be cooked all the way through (core temperature 71 °C) with no pink meat."],
  },
  offal: {
    form: "Fresh offal",
    meat: true,
    extraWarnings: [
      "Liver is very high in vitamin A. Pregnant women should avoid liver and liver products.",
    ],
  },
  tripe: {
    form: "Fresh tripe",
    meat: true,
    extraHow: "Rinse thoroughly in several changes of cold water, then simmer for 2–3 hours until tender.",
  },
  bones: {
    form: "Soup bones",
    meat: true,
    extraHow: "Simmer for 2–4 hours to make stock or soup, skimming off any foam.",
    extraWarnings: ["Bones are sharp and can splinter — do not give cooked bones to pets."],
  },

  chicken: {
    form: "Fresh chicken",
    temperature: "Chilled",
    storage: "Keep refrigerated at 0–4 °C and cook within 2 days, or freeze on the day of delivery and use within 3 months. Thaw in the fridge.",
    howToUse: "Do not wash raw chicken (it spreads bacteria). Roast, grill, fry or stew until the juices run clear and the thickest part reaches 75 °C.",
    highlights: ["High in protein"],
    warnings: [
      "Raw poultry: keep separate from ready-to-eat foods and wash hands, knives and boards after handling.",
      "Cook thoroughly — never serve chicken pink.",
    ],
  },
  eggs: {
    form: "Fresh eggs",
    allergens: ["Eggs"],
    storage: "Store in a cool place or the fridge, away from strong smells, and use by the best-before date.",
    howToUse: "Boil, fry, scramble, poach or use in baking.",
    highlights: ["Source of high-quality protein", "Source of vitamins B12 and D"],
    warnings: [
      "Do not use cracked or dirty eggs.",
      "Babies, pregnant women, older people and anyone unwell should only eat eggs cooked until the white and yolk are firm.",
    ],
  },

  driedBeans: {
    form: "Dried beans",
    temperature: "Ambient",
    storage: "Store in an airtight container in a cool, dry place.",
    howToUse: "Pick through for small stones, rinse, then soak in cold water for 8–12 hours. Drain, cover with fresh water and boil hard for at least 10 minutes, then simmer for 1–2 hours until soft.",
    highlights: ["Source of protein and fibre"],
    warnings: [
      "Never eat dried beans raw or undercooked: they contain natural lectins that cause severe stomach upset. Always soak and boil hard for at least 10 minutes.",
    ],
  },
  soybeans: {
    form: "Dried soybeans",
    temperature: "Ambient",
    allergens: ["Soya"],
    storage: "Store in an airtight container in a cool, dry place.",
    howToUse: "Rinse and soak for 8–12 hours, then boil for 2–3 hours until tender. Also used to make soy milk and flour.",
    highlights: ["High in plant protein"],
    warnings: ["Do not eat raw — always soak and cook thoroughly."],
  },
  lentils: {
    form: "Dried lentils",
    temperature: "Ambient",
    storage: "Store in an airtight container in a cool, dry place.",
    howToUse: "Rinse and pick out any small stones. No soaking needed: simmer for 15–30 minutes until tender, in soups, stews and dals.",
    highlights: ["Source of protein, fibre and iron"],
  },
  chickpeas: {
    form: "Dried chickpeas",
    temperature: "Ambient",
    storage: "Store in an airtight container in a cool, dry place.",
    howToUse: "Soak in cold water for 8–12 hours, drain and simmer for 1–2 hours until tender. Use in curries, salads and hummus.",
    highlights: ["Source of protein and fibre"],
    warnings: ["Do not eat raw — always soak and cook thoroughly."],
  },
  groundnuts: {
    form: "Groundnuts (peanuts)",
    temperature: "Ambient",
    allergens: ["Peanuts"],
    storage: "Store in an airtight container in a cool, dry place and use within 3 months.",
    howToUse: "Roast in a dry pan or oven until golden, eat as a snack, or grind into groundnut paste for sauces.",
    highlights: ["Source of protein and healthy fats"],
    warnings: [
      "Discard any nuts that are mouldy, discoloured or shrivelled — they can contain harmful aflatoxins.",
      "Whole nuts are a choking hazard: do not give to children under 5.",
    ],
  },
  groundnutPaste: {
    form: "Groundnut paste",
    ingredients: "Roasted groundnuts (peanuts).",
    temperature: "Ambient",
    allergens: ["Peanuts"],
    storage: "Store in a cool, dry place. Once opened, keep sealed and use within 4 weeks; refrigerate in hot weather.",
    howToUse: "Mix with warm water to a smooth sauce and simmer with greens, fish or meat, or spread on bread.",
    highlights: ["Source of protein", "Traditional Ugandan sauce base"],
  },
  cashew: {
    form: "Cashew nuts",
    temperature: "Ambient",
    allergens: ["Tree nuts (cashew)"],
    storage: "Store in an airtight container in a cool, dry place and use within 3 months.",
    howToUse: "Eat as a snack, toast and add to stir-fries, salads and curries.",
    highlights: ["Source of protein, magnesium and healthy fats"],
    warnings: ["Whole nuts are a choking hazard: do not give to children under 5."],
  },
  walnut: {
    form: "Walnuts",
    temperature: "Ambient",
    allergens: ["Tree nuts (walnut)"],
    storage: "Store in an airtight container in the fridge or a cool, dry place and use within 3 months.",
    howToUse: "Eat as a snack, or chop into salads, porridge and baking.",
    highlights: ["Source of omega-3 fats"],
    warnings: ["Whole nuts are a choking hazard: do not give to children under 5."],
  },
  sesame: {
    form: "Sesame seeds",
    temperature: "Ambient",
    allergens: ["Sesame"],
    storage: "Store in an airtight container in a cool, dry place.",
    howToUse: "Toast in a dry pan until golden and sprinkle over salads, vegetables and bread, or grind into paste (simsim).",
    highlights: ["Source of calcium and healthy fats"],
  },
  sunflowerSeeds: {
    form: "Sunflower seeds",
    temperature: "Ambient",
    storage: "Store in an airtight container in a cool, dry place.",
    howToUse: "Eat as a snack or sprinkle over salads, cereal and bread.",
    highlights: ["Source of vitamin E"],
  },
  honey: {
    form: "Honey",
    ingredients: "Honey.",
    temperature: "Ambient",
    storage: "Store at room temperature with the lid closed. Honey may crystallise naturally — warm the jar gently in water to make it runny again.",
    howToUse: "Stir into tea and porridge, drizzle over yoghurt and fruit, or use in baking and marinades.",
    highlights: ["Natural sweetener"],
    warnings: ["Do not give honey to babies under 12 months old."],
  },

  maize: {
    form: "Maize grain",
    temperature: "Ambient",
    storage: "Store in a clean, dry, airtight container off the floor to keep out moisture and pests.",
    howToUse: "Mill into flour for posho, or boil and roast whole grains.",
    highlights: ["Staple cereal", "Naturally gluten-free"],
    warnings: ["Do not use grain that is mouldy, damp or discoloured — it can contain harmful aflatoxins."],
  },
  maizeFlour: {
    form: "Maize flour",
    ingredients: "Maize (corn) flour.",
    temperature: "Ambient",
    storage: "Store in an airtight container in a cool, dry place.",
    howToUse: "Stir into boiling water and cook, stirring, until thick and smooth to make posho (ugali), or use for porridge.",
    highlights: ["Naturally gluten-free"],
    warnings: ["Cook before eating — do not eat raw flour."],
  },
  wheatFlour: {
    form: "Wheat flour",
    ingredients: "Wheat flour.",
    temperature: "Ambient",
    allergens: ["Cereals containing gluten (wheat)"],
    storage: "Store in an airtight container in a cool, dry place.",
    howToUse: "Use for chapati, mandazi, bread, cakes and for thickening sauces.",
    highlights: ["All-purpose baking flour"],
    warnings: ["Do not eat raw flour or raw dough — always cook or bake thoroughly."],
  },
  barley: {
    form: "Barley grain",
    temperature: "Ambient",
    allergens: ["Cereals containing gluten (barley)"],
    storage: "Store in an airtight container in a cool, dry place.",
    howToUse: "Rinse and simmer for 30–45 minutes until tender for soups, stews and salads.",
    highlights: ["Source of fibre"],
  },
  millet: {
    form: "Millet",
    temperature: "Ambient",
    storage: "Store in an airtight container in a cool, dry place.",
    howToUse: "Rinse and simmer as a grain, or mill into flour for millet bread (kalo) and porridge (bushera).",
    highlights: ["Naturally gluten-free", "Source of fibre and iron"],
  },
  sorghum: {
    form: "Sorghum grain",
    temperature: "Ambient",
    storage: "Store in an airtight container in a cool, dry place.",
    howToUse: "Rinse and simmer for about 1 hour until tender, or mill into flour for porridge.",
    highlights: ["Naturally gluten-free", "Source of fibre"],
  },
  rice: {
    form: "Rice",
    temperature: "Ambient",
    storage: "Store in an airtight container in a cool, dry place.",
    howToUse: "Rinse until the water runs clear, then cook in about 1½–2 parts water for 12–20 minutes until tender.",
    highlights: ["Naturally gluten-free"],
    warnings: ["Cool leftover cooked rice quickly, refrigerate within 1 hour and eat within 24 hours. Reheat only once, until piping hot."],
  },

  coffeeBeans: {
    form: "Coffee beans",
    temperature: "Ambient",
    storage: "Store in an airtight container in a cool, dark place. Use within a month of opening for the best flavour.",
    howToUse: "Grind just before brewing. Use about 1 tablespoon (7 g) of ground coffee per 150 ml of water.",
    highlights: ["Ugandan-grown coffee"],
    warnings: ["Contains caffeine. Not recommended for children; pregnant women should limit caffeine to 200 mg a day."],
  },
  instantCoffee: {
    form: "Instant coffee",
    ingredients: "Instant coffee.",
    temperature: "Ambient",
    storage: "Keep the lid tightly closed and store in a cool, dry place.",
    howToUse: "Add 1–2 teaspoons to a cup of hot (not boiling) water and add milk or sugar to taste.",
    highlights: ["Quick to prepare"],
    warnings: ["Contains caffeine. Not recommended for children; pregnant women should limit caffeine to 200 mg a day."],
  },
  tea: {
    form: "Tea",
    temperature: "Ambient",
    storage: "Store in an airtight container away from light and strong smells.",
    howToUse: "Use 1 teaspoon per cup. Brew black tea with freshly boiled water for 3–5 minutes; green tea with water just off the boil (about 80 °C) for 2–3 minutes.",
    highlights: ["Ugandan-grown tea"],
    warnings: ["Contains caffeine."],
  },
  cocoaPowder: {
    form: "Cocoa powder",
    ingredients: "Cocoa powder.",
    temperature: "Ambient",
    storage: "Store in an airtight container in a cool, dry place.",
    howToUse: "Whisk into hot milk for a chocolate drink, or use in baking and desserts.",
    highlights: ["Unsweetened"],
    warnings: ["Contains caffeine and theobromine. Keep away from dogs and other pets."],
  },
  rawCocoa: {
    form: "Raw cocoa beans",
    temperature: "Ambient",
    storage: "Store in a dry, ventilated place off the floor.",
    howToUse: "A raw agricultural commodity for processing: beans are fermented, dried, roasted and winnowed before use in chocolate or cocoa.",
    highlights: ["Ugandan-grown cocoa"],
    warnings: ["Not ready to eat — must be processed before consumption. Keep away from pets."],
  },

  milk: {
    form: "Fresh milk",
    temperature: "Chilled",
    allergens: ["Milk"],
    ingredients: "Cow's milk.",
    storage: "Keep refrigerated at 0–5 °C and use within 3 days of opening.",
    howToUse: "Drink chilled, or use in tea, porridge, cooking and baking.",
    highlights: ["Source of calcium and protein"],
    warnings: ["If the milk is not pasteurised, bring it to the boil before drinking."],
  },
  uhtMilk: {
    form: "UHT milk",
    temperature: "Ambient until opened",
    allergens: ["Milk"],
    ingredients: "Cow's milk.",
    storage: "Store unopened in a cool, dry place. Once opened, refrigerate and use within 3 days.",
    howToUse: "Drink chilled, or use in tea, porridge, cooking and baking.",
    highlights: ["Long shelf life until opened", "Source of calcium and protein"],
  },
  cream: {
    form: "Fresh cream",
    temperature: "Chilled",
    allergens: ["Milk"],
    ingredients: "Cream (milk).",
    storage: "Keep refrigerated at 0–5 °C and use within 2 days of opening.",
    howToUse: "Pour over desserts, whip for cakes, or stir into sauces and soups at the end of cooking.",
    highlights: ["Rich and smooth"],
  },

  flowers: {
    form: "Fresh cut flowers",
    nonFood: true,
    storage: "Keep in a cool place out of direct sunlight and away from fruit.",
    howToUse: "Trim 2–3 cm off the stems at an angle, remove leaves below the waterline and place in a clean vase of fresh water. Change the water every 2 days.",
    highlights: ["Grown in Uganda"],
    warnings: ["Not for consumption."],
  },
  lilies: {
    form: "Fresh cut lilies",
    nonFood: true,
    storage: "Keep in a cool place out of direct sunlight and away from fruit.",
    howToUse: "Trim the stems at an angle and place in clean water. Remove the pollen-bearing anthers to prevent staining.",
    highlights: ["Grown in Uganda"],
    warnings: ["Lilies are highly toxic to cats — even small amounts of pollen can be fatal. Keep away from cats.", "Not for consumption."],
  },
  orchids: {
    form: "Orchids",
    nonFood: true,
    storage: "Keep in bright, indirect light away from draughts.",
    howToUse: "Water once a week by soaking the roots briefly and letting them drain fully; never leave standing in water.",
    highlights: ["Long-lasting flowering plant"],
    warnings: ["Not for consumption."],
  },
  seedlings: {
    form: "Planting material",
    nonFood: true,
    storage: "Keep in a shaded, ventilated place and plant as soon as possible.",
    howToUse: "Plant into prepared, well-drained soil and water regularly until established.",
    highlights: ["For growing your own crops"],
    warnings: ["Not for eating — seeds and planting materials may be treated."],
  },
  feed: {
    form: "Animal feed",
    nonFood: true,
    storage: "Store in a dry, cool, well-ventilated place off the floor, away from rodents. Do not use if damp or mouldy.",
    howToUse: "Feed according to the animals' age and production stage, with constant access to clean water.",
    highlights: ["Formulated animal feed"],
    warnings: ["For animal use only — not for human consumption."],
  },
  fertiliser: {
    form: "Fertiliser",
    nonFood: true,
    storage: "Store in a dry, locked place away from children, animals, food and feed.",
    howToUse: "Apply at the rate recommended for your crop and soil; avoid contact with leaves and water in afterwards.",
    highlights: ["Crop nutrition"],
    warnings: [
      "Keep out of reach of children and animals.",
      "Wear gloves when handling and wash hands afterwards. Not for consumption.",
    ],
  },
  rawMaterial: {
    form: "Agro-industrial raw material",
    nonFood: true,
    storage: "Store in a dry, ventilated warehouse off the floor.",
    howToUse: "Raw material for industrial processing.",
    highlights: ["Ugandan-grown"],
    warnings: ["Not for consumption."],
  },
};

/** Ordered: first match wins. Multi-ingredient, branded and chemical items → "label". */
const MATCHERS = [
  [/pesticide|herbicide|insecticide/i, "label"],
  [/coca-cola|fanta|mirinda|7up|mountain dew|stoney|ribena|pringles|nescaf|nes cafe|del monte/i, "label"],
  [/juice|julice|jiuce|bushera|soda/i, "label"],
  [/jam|pickle|sauce|chilli paste|tomato paste|peanut butter|chips|crisps/i, "label"],
  [/sausage|bacon|burger|patties|smoked beef|smoked pork|pork rinds/i, "label"],
  [/yoghurt|yogurt|cheese|butter\b/i, "label"],
  [/dried (mango|passion|pineapple)|passion dried|premium dried|processed mango|passion fruit pulp/i, "label"],
  [/smashed potatoes/i, "label"],

  [/bell pepper|^peppers|green peppers|red peppers|yellow peppers|paprika pepper|banana pepper/i, "pepper"],
  [/tilapia|perch|pearch|cat ?fish|fish fillet/i, "fishFresh"],
  [/grapefruit/i, "grapefruit"],
  [/orange|tangerine|mandarin|easy peeler|lemon|lime\b|citrus/i, "citrus"],
  [/sliced|slices?\b|water melon slice/i, "cutFruit"],
  [/mango|mnagoes/i, "mango"],
  [/pineapple|pine apple/i, "pineapple"],
  [/matooke/i, "matooke"],
  [/banana/i, "banana"],
  [/frozen avocado/i, "frozenAvocado"],
  [/avocado oil|avacodo oil/i, "avocadoOil"],
  [/avocado|avacodo/i, "avocado"],
  [/passion/i, "passion"],
  [/papaya|paw ?paw/i, "papaya"],
  [/water ?melon/i, "watermelon"],
  [/jackfruit/i, "jackfruit"],
  [/strawberr|raspberr|blueberr/i, "berries"],
  [/apple/i, "apple"],
  [/\bpears?\b/i, "pear"],
  [/sugarcane/i, "sugarcane"],

  [/tomato seedling|bean seeds|onion sets|maize seed|seedling/i, "seedlings"],
  [/tomato/i, "tomato"],
  [/carrot/i, "carrot"],
  [/salad leaves|lettuce|iceberg/i, "salad"],
  [/malakwang|bitter/i, "bitterGreens"],
  [/spinach|kale|nakati|amaranth|bugga|dodo/i, "leafy"],
  [/courgette/i, "courgette"],
  [/sweet ?corn/i, "sweetcorn"],
  [/broccoli/i, "broccoli"],
  [/sugar snap|snow peas/i, "peas"],
  [/broad beans/i, "broadBeans"],
  [/french beans|fine beans|green beans/i, "greenBeans"],
  [/cabbage/i, "cabbage"],
  [/garden egg/i, "gardenEggs"],
  [/onion/i, "onion"],
  [/garlic/i, "garlic"],
  [/ginger/i, "ginger"],
  [/turmeric/i, "turmeric"],
  [/basil|rosemary|mint|coriander|parsley|thyme/i, "herb"],
  [/black pepper/i, "driedSpice"],
  [/beetroot/i, "beetroot"],
  [/sweet potato/i, "sweetPotato"],
  [/potato/i, "potato"],
  [/cassava flour/i, "cassavaFlour"],
  [/cassava/i, "cassava"],
  [/yam/i, "yam"],

  [/chilli powder|chili powder|crushed chilli|chilli flakes/i, "chilliGround"],
  [/dried|sun-dried/i, "driedChilli"],
  [/chilli|chili|habanero|scotch bonnet|jalape|serrano|cayenne|piri|peri|hot pepper/i, "freshChilli"],

  [/mackerel/i, "mackerel"],
  [/silver ?fish|mukene/i, "silverfish"],
  [/smoked fish|salted fish|nile perch smoked|smoked/i, "fishPreserved"],
  [/tilapia|perch|pearch|cat ?fish|fish/i, "fishFresh"],

  [/liver|heart|tongue|kidney/i, "offal"],
  [/tripe/i, "tripe"],
  [/bones/i, "bones"],
  [/mince/i, "mince"],
  [/pork|trotters/i, "pork"],
  [/lamb/i, "lamb"],
  [/goat/i, "goat"],
  [/beef|oxtail/i, "beef"],

  [/chicken/i, "chicken"],
  [/eggs/i, "eggs"],

  [/soy ?beans/i, "soybeans"],
  [/lentil/i, "lentils"],
  [/chickpea/i, "chickpeas"],
  [/groundnut paste/i, "groundnutPaste"],
  [/groundnut|peanut/i, "groundnuts"],
  [/cocoa beans/i, "rawCocoa"],
  [/coffee beans|arabica|robusta|ankole coffee|^coffee$/i, "coffeeBeans"],
  [/beans|cowpeas/i, "driedBeans"],
  [/cashew/i, "cashew"],
  [/walnut/i, "walnut"],
  [/sesame/i, "sesame"],
  [/sunflower seeds/i, "sunflowerSeeds"],
  [/honey/i, "honey"],

  [/maize flour/i, "maizeFlour"],
  [/wheat flour/i, "wheatFlour"],
  [/maize/i, "maize"],
  [/barley/i, "barley"],
  [/millet/i, "millet"],
  [/sorghum/i, "sorghum"],
  [/rice/i, "rice"],

  [/instant coffee/i, "instantCoffee"],
  [/coffee/i, "coffeeBeans"],
  [/tea/i, "tea"],
  [/cocoa powder/i, "cocoaPowder"],

  [/uht milk/i, "uhtMilk"],
  [/milk/i, "milk"],
  [/cream/i, "cream"],

  [/lilies|lily/i, "lilies"],
  [/orchid/i, "orchids"],
  [/roses|sunflowers|flowers/i, "flowers"],
  [/mash|dairy meal|feed/i, "feed"],
  [/fertili[sz]er/i, "fertiliser"],
  [/cotton lint|sisal/i, "rawMaterial"],
];

/** "Lemons Family Pack" → "lemons"; used for single-ingredient ingredient lines. */
function ingredientName(name) {
  return name
    .toLowerCase()
    .replace(/\b(family pa(ck|rk)|mini pack|\d+ pack|pack|pick|fresh|ripe|premium|jumbo|large|export gradde|export|whole|young)\b/g, "")
    .replace(/[(),]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function baseName(title) {
  return String(title || "")
    .replace(/\s*–\s*One Source$/i, "")
    .replace(/\s*–.*$/, "")
    .trim();
}

function isPrepared(title) {
  return /\b(fillet|steak|chops|cubes|stew|curry|soup pack|ribs|leg|shoulder|neck|loin|belly|brisket|shank|backstrap)\b/i.test(title);
}

/**
 * Build structured details for a Fresh listing.
 * @returns {{ details: object, complete: boolean, reason?: string }}
 */
export function freshProductDetails({ title, unit, category }) {
  const name = baseName(title);
  const match = MATCHERS.find(([re]) => re.test(name));
  if (!match) return { details: {}, complete: false, reason: "no-info" };
  if (match[1] === "label") {
    return { details: {}, complete: false, reason: "needs-label" };
  }

  const t = T[match[1]];
  let { storage, howToUse, warnings = [], allergens = [] } = t;
  let temperature = t.temperature;

  if (t.meat) {
    temperature = "Chilled";
    storage =
      "Keep refrigerated at 0–4 °C and cook within 2 days (within 1 day for mince and offal), or freeze on the day of delivery and use within 3 months. Thaw in the fridge.";
    howToUse = [
      t.extraHow,
      isPrepared(name)
        ? "Season and cook to suit the cut: quick-cook steaks and chops in a hot pan or on the grill; slow-cook stew, curry and shoulder cuts in liquid until tender."
        : "Season and cook to suit the cut: grill or pan-fry tender cuts, and slow-cook tougher cuts in stews and soups until tender.",
    ]
      .filter(Boolean)
      .join(" ");
    warnings = [...CHILLED_RAW_MEAT, ...(t.extraWarnings ?? [])];
  }

  const highlights = [...(t.highlights ?? [])];
  if (/organic/i.test(name)) highlights.unshift("Organically grown");
  if (/export/i.test(name)) highlights.unshift("Export-grade quality");

  const isFood = !t.nonFood;
  const allergenStatement = !isFood
    ? undefined
    : allergens.length
      ? `Contains: ${allergens.join(", ")}.`
      : "None of the 14 major food allergens is an ingredient of this product.";

  const details = {
    brand: "One Source",
    form: t.form,
    origin: /british|conference|cox|maris piper|fairtrade|grapefruit|blueberr|raspberr|walnut/i.test(name)
      ? undefined
      : "Uganda",
    temperature: temperature ?? (t.nonFood ? undefined : "Fresh"),
    ingredients: isFood ? t.ingredients ?? `100% ${ingredientName(name)}.` : undefined,
    allergens: isFood ? allergens : undefined,
    allergenStatement: [allergenStatement, t.allergenNote].filter(Boolean).join(" ") || undefined,
    howToUse,
    storage,
    warnings: warnings.length ? warnings : undefined,
    highlights,
    suitableFor: isFood && !t.meat && !/fish|chicken|mackerel|silverfish|eggs|milk|cream|honey/i.test(match[1])
      ? ["Vegetarians", "Vegans"]
      : isFood && /eggs|milk|cream|honey/.test(match[1])
        ? ["Vegetarians"]
        : undefined,
    unit: unit || undefined,
  };

  return { details: prune(details), complete: true, type: match[1] };
}

function prune(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

/** One-paragraph shop description from the structured details. */
export function freshDescription(title, details) {
  const name = baseName(title);
  const parts = [`${name}${details.origin ? ` from ${details.origin}` : ""}.`];
  if (details.highlights?.length) parts.push(`${details.highlights.join(". ")}.`);
  if (details.howToUse) parts.push(details.howToUse.split(/(?<=\.)\s/)[0]);
  return parts.join(" ").replace(/\.\./g, ".");
}
