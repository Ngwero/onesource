/**
 * Kitchen product information: specifications, care and safety advice.
 *
 * Manufacturer data (Cookware Store page cache, Made In feed, Everything Kitchens CSV)
 * is always preferred. Where only a title is available we state facts that follow
 * from the title itself (material, size, piece count) plus general care / safety
 * guidance for that kind of item — never invented features such as "dishwasher safe".
 */

export const stripSuffix = (title) => String(title || "").replace(/\s+–\s+One Source( pick)?\s*$/i, "").trim();

const MATERIALS = [
  ["enamelled cast iron", /enam(?:el+ed|el)\s+cast[\s-]iron/i],
  ["cast iron", /cast[\s-]iron/i],
  ["carbon steel", /carbon[\s-]steel|blue steel/i],
  ["stainless steel", /stainless|18\/10|inox/i],
  ["copper", /\bcopper\b/i],
  ["aluminium", /\balumini?um\b/i],
  ["borosilicate glass", /borosilicate/i],
  ["crystal glass", /\bcrystal\b/i],
  ["glass", /\bglass(?!es)\b/i],
  ["stoneware", /stoneware/i],
  ["earthenware", /earthenware|terracotta/i],
  ["porcelain", /porcelain|bone china|\bfine china\b/i],
  ["ceramic", /\bceramic\b/i],
  ["enamel", /\benamel(?:led)?\b/i],
  ["melamine", /melamine/i],
  ["silicone", /silicone/i],
  ["olive wood", /olive\s*wood/i],
  ["bamboo", /bamboo/i],
  ["beech wood", /\bbeech\b/i],
  ["acacia wood", /\bacacia\b/i],
  ["oak", /\boak\b/i],
  ["wood", /\bwood(?:en)?\b|walnut|teak/i],
  ["marble", /\bmarble\b/i],
  ["slate", /\bslate\b/i],
  ["linen", /\blinen\b/i],
  ["cotton", /\bcotton\b/i],
  ["plastic", /\bplastic\b|\btritan\b|polypropylene|\bacrylic\b/i],
  ["steel", /\bsteel\b/i],
];

export function detectMaterials(text) {
  const out = [];
  for (const [name, re] of MATERIALS) {
    if (!re.test(text)) continue;
    if (out.some((m) => m.includes(name) || (name === "steel" && /steel/.test(m)) || (name === "glass" && /glass/.test(m)) || (name === "wood" && /wood|bamboo|beech|acacia|oak/.test(m)) || (name === "enamel" && /enamel/.test(m)))) continue;
    out.push(name);
  }
  return out;
}

const FRACTIONS = { "½": ".5", "¼": ".25", "¾": ".75" };
function sizes(title) {
  const t = title.replace(/\s?([½¼¾])/g, (_, f) => FRACTIONS[f]);
  const specs = [];
  const dia = t.match(/(?:Ø|ø|diameter\s*)\s*(\d+(?:[.,]\d+)?)\s*(cm|mm)/i);
  if (dia) specs.push({ key: "diameter", label: "Diameter", value: `${dia[1].replace(",", ".")} ${dia[2]}` });
  const dims = t.match(/(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)(?:\s*x\s*(\d+(?:[.,]\d+)?))?\s*(cm|mm|in(?:ch(?:es)?)?|")/i);
  if (dims) {
    const unit = /^in|"/.test(dims[4]) ? "in" : dims[4];
    specs.push({ key: "dimensions", label: "Dimensions", value: `${[dims[1], dims[2], dims[3]].filter(Boolean).join(" × ")} ${unit}` });
  } else if (!dia) {
    const len = t.match(/\b(\d+(?:[.,]\d+)?)\s*(cm|mm)\b/i) || t.match(/\b(\d+(?:\.\d+)?)\s*(?:"|-?inch(?:es)?\b|-?in\b)/i);
    if (len) specs.push({ key: "size", label: "Size", value: `${len[1].replace(",", ".")} ${len[2] && /cm|mm/i.test(len[2]) ? len[2].toLowerCase() : "in"}` });
  }
  const cap = t.match(/\b(\d+(?:[.,]\d+)?)\s*(L|litres?|liters?|ml|cl|qt\.?|quarts?|oz|fl\.?\s*oz|cups?)\b/i);
  if (cap) specs.push({ key: "capacity", label: "Capacity", value: `${cap[1].replace(",", ".")} ${cap[2].replace(/litres?|liters?/i, "L").replace(/quarts?|qt\.?/i, "qt").replace(/^l$/i, "L")}` });
  const pcs =
    t.match(/\(?\bset of (\d+)\b/i) ||
    t.match(/\b(\d+)[\s-]*(?:pc|pcs|piece|pieces|pack)\b/i) ||
    t.match(/\((\d+)\s*(?:pc|pcs|pieces?)\)/i);
  if (pcs && Number(pcs[1]) > 1) specs.push({ key: "pieces", label: "Pieces", value: pcs[1] });
  return specs;
}

const W = {
  sharp: "Very sharp blade. Keep out of reach of children and store safely (knife block, sheath or magnetic strip).",
  sharpWash: "Wash sharp blades by hand, one at a time, with the edge facing away from you — never leave them in a washing-up bowl.",
  hotHandles: "Handles, lids and knobs can become very hot — use oven gloves or a pot holder.",
  emptyHeat: "Never heat the pan empty or leave it unattended on a high flame.",
  turnHandles: "Turn handles inwards on the hob so children cannot pull the pan down.",
  heavy: "Heavy when full — lift with both hands.",
  ptfe: "Non-stick coatings: cook on low to medium heat, never heat empty, and use wooden, silicone or nylon utensils. Overheated non-stick pans give off fumes that are dangerous to pet birds — keep the kitchen ventilated.",
  thermal: "Avoid sudden temperature changes (e.g. hot dish onto a cold or wet surface, or cold water into a hot dish) — it can crack or shatter.",
  fragile: "Fragile — handle with care. Do not use if chipped or cracked.",
  metalTrim: "Pieces with gold, silver or platinum decoration must not go in the microwave.",
  melamine: "Melamine is not microwave-safe and should not be used for very hot or acidic food for long periods.",
  plasticHeat: "Not for oven, hob or open-flame use.",
  copperAcid: "Unlined copper reacts with acidic food (tomatoes, citrus, vinegar) — use lined copper for cooking.",
  aluAcid: "Do not store acidic or salty food in uncoated aluminium.",
  pressure: "Read the manufacturer's instructions before first use. Never fill above the maximum mark, check the valve and gasket each time, and never force the lid open while there is pressure inside.",
  moka: "Always fill with water to just below the safety valve; never heat it empty and never open while hot.",
  frenchPress: "Hot liquid — press slowly and steadily; keep away from children.",
  charcoal: "Outdoor use only. Never use a charcoal or gas barbecue indoors or in a tent — it produces carbon monoxide, which can kill.",
  flame: "Open flame: use on a stable, heat-resistant surface, never leave unattended and never refill the burner while lit.",
  child: "Adult supervision required. Check regularly for damage and discard if damaged.",
  battery: "Battery-operated: keep batteries (especially coin/button cells) out of reach of children — if one is swallowed, seek medical help immediately. Keep the device away from water and remove the batteries if it will not be used for a while.",
  ovenGloveWet: "Do not use when wet or damp — heat passes through damp fabric and can burn.",
  corkscrew: "Sharp spiral — keep away from children.",
  bin: "Keep plastic bin liners away from babies and young children to avoid suffocation.",
  glassBottle: "Glass — do not overfill with hot liquids or freeze when full.",
  mandoline: "Extremely sharp — always use the hand/food guard; consider cut-resistant gloves.",
  electricGeneric: "Electrical appliance: read the manufacturer's safety instructions before use, keep away from water, unplug when not in use and before cleaning, and keep the cable out of reach of children.",
  usVoltage: "US model — rated 120 V with a US plug. Uganda's mains supply is 240 V: this appliance must only be used with a correctly rated step-down voltage transformer. Plugging it straight into a Ugandan socket will damage it and can cause a fire.",
  euPlug: "Designed for 220–240 V mains (suitable for Uganda's 240 V supply). Check the plug type on delivery and use a certified Type G (UK-style) adapter if needed.",
};

const CARE = {
  "enamelled cast iron": "Allow to cool before washing. Wash by hand in warm soapy water and dry thoroughly. Use wooden, silicone or heat-resistant plastic utensils to protect the enamel.",
  "cast iron": "Wash by hand with hot water (little or no soap), dry immediately and wipe with a thin coat of cooking oil to keep it seasoned. Not dishwasher safe.",
  "carbon steel": "Season before first use. Wash by hand, dry immediately on the hob and rub with a little oil to prevent rust. Not dishwasher safe.",
  copper: "Wash by hand and dry straight away. Polish the exterior with a copper cleaner to restore its shine.",
  "stainless steel": "Wash in warm soapy water and dry to prevent water spots. Stubborn marks lift with a stainless-steel cleaner or bicarbonate of soda.",
  aluminium: "Wash by hand in warm soapy water; avoid harsh scourers.",
  wood: "Wash by hand and dry straight away — never soak or put in the dishwasher. Rub with food-safe mineral oil now and then to stop it drying and cracking.",
  porcelain: "Wash in warm soapy water. Avoid abrasive scourers on glazed or decorated surfaces.",
  glass: "Wash in warm soapy water and dry with a lint-free cloth. Hand washing is kindest to fine and decorated glass.",
  silicone: "Wash in warm soapy water. Do not use on a direct flame or hob.",
  plastic: "Wash in warm soapy water. Keep away from direct heat.",
  textile: "Wash according to the care label. Wash new textiles before first use.",
  melamine: "Wash in warm soapy water. Not for microwave use.",
  marble: "Wipe with a damp cloth and dry. Avoid acidic liquids (lemon, vinegar) which etch marble.",
};

const careFor = (m) => {
  if (!m) return undefined;
  if (/enamelled cast iron/.test(m)) return CARE["enamelled cast iron"];
  if (/cast iron/.test(m)) return CARE["cast iron"];
  if (/carbon steel/.test(m)) return CARE["carbon steel"];
  if (/copper/.test(m)) return CARE.copper;
  if (/stainless|steel/.test(m)) return CARE["stainless steel"];
  if (/alumin/.test(m)) return CARE.aluminium;
  if (/wood|bamboo|oak/.test(m)) return CARE.wood;
  if (/porcelain|stoneware|earthenware|ceramic|enamel/.test(m)) return CARE.porcelain;
  if (/glass/.test(m)) return CARE.glass;
  if (/silicone/.test(m)) return CARE.silicone;
  if (/melamine/.test(m)) return CARE.melamine;
  if (/plastic/.test(m)) return CARE.plastic;
  if (/cotton|linen/.test(m)) return CARE.textile;
  if (/marble|slate/.test(m)) return CARE.marble;
  return undefined;
};

const ELECTRIC =
  /\b(stand mixer|hand mixer|mixer|blender|food processor|toaster|electric|elettric|\d{3,4}\s?W|kettle(?=.*\b(?:electric|cordless)\b)|air ?fryer|deep fryer|slow cooker|multi-?cooker|instant pot|rice cooker|espresso machine|drip coffee|bean to cup|juicer(?!.*\b(?:manual|hand|press)\b)|dehydrator|sous vide|immersion circulator|waffle maker|sandwich maker|ice cream maker|milk steamer|vacuum sealer|panini|raclette (?:grill|party)|party grill|pizza oven(?=.*\b(?:rotating|electric)\b)|nut milk maker)\b/i;
const NOT_APPLIANCE = /\b(accessor(?:y|ies)|replacement|parts?|attachment|holder|cover|bowl(?! lift)|lid|blade|gasket|seal|filter|jars?|jug|carafe|container|paddles?|whisk attachment|dough hook|beater|cookbook|book|cleaning tablets|descaler|pod holder|capsule|electric blue|brush|tongs|microwave|solar|tap|cafeti[eè]r[eé]?|citrus press|oven dish|ramekin)\b/i;
const BATTERY_DEVICE = /\b(mill|mills|scale|scales|timer|thermometer|corkscrew|bottle stopper|wine opener|can opener|tin opener|frother(?!.*\b(?:\d{3,4}\s?W|steamer)\b))\b/i;

/** Ordered profiles: first match wins. */
const PROFILES = [
  { kind: "mandoline", re: /mandoline|spiral(?:izer|iser)|v-?slicer/i, use: "slices, juliennes and shreds vegetables quickly and evenly", warnings: [W.mandoline, W.sharpWash] },
  { kind: "knife", re: /\bknife|\bknives|cleaver|santoku|nakiri|gyuto|deba|petty knife|filleting/i, use: "for precise cutting and preparation", warnings: [W.sharp, W.sharpWash], care: "Wash by hand straight after use and dry immediately; dishwashers dull and damage blades. Keep the edge sharp with a honing steel or sharpener and use on a wooden or plastic board." },
  { kind: "sharpTool", re: /scissors|shears|grater|zester|peeler|pizza cutter|sharpener|microplane|can opener|tin opener|oyster|slicer|corer|cutter|knife block|messenblok/i, use: "for everyday food preparation", warnings: [W.sharp] },
  { kind: "pressure", re: /pressure (?:cooker|canner)/i, use: "cooks stews, beans and tough cuts much faster under pressure", warnings: [W.pressure, W.hotHandles, W.turnHandles] },
  { kind: "moka", re: /percolator|moka|espresso maker|stovetop espresso|caffettiera/i, use: "brews strong stovetop coffee", warnings: [W.moka, W.hotHandles] },
  { kind: "frenchPress", re: /cafeti[eè]re|french press|coffee press|plunger/i, use: "brews full-bodied coffee or loose-leaf tea", warnings: [W.frenchPress, W.thermal] },
  { kind: "barbecue", re: /barbecue|\bbbq\b|charcoal|kamado|plancha|smoker|chimney starter|fire ?pit/i, use: "for outdoor grilling and cooking", warnings: [W.charcoal, W.hotHandles] },
  { kind: "fondue", re: /fondue|tealight|burner|réchaud|rechaud|chafing/i, use: "for fondue and keeping food warm at the table", warnings: [W.flame, W.hotHandles] },
  { kind: "pan", re: /frying pan|fry pan|skillet|saut[eé]|wok|griddle|grill pan|crepe|crêpe|pancake pan|paella|omelette|blini|stir[- ]fry|chef'?s pan|tava|tawa|kadai|karahi/i, use: "for frying, searing and sautéing", warnings: [W.hotHandles, W.emptyHeat, W.turnHandles] },
  { kind: "pot", re: /saucepan|sauce pan|stock ?pot|cooking pot|\bpot\b|casserole|dutch oven|cocotte|braiser|stew|soup pot|pasta pot|milk pan|steamer|tagine|roaster|roasting|\bpan set\b|cookware set|pan set|\bpans?\b(?!.*(?:cake|tart|muffin|loaf|bundt|pie|springform|sheet|baking))/i, use: "for simmering, boiling, braising and slow cooking", warnings: [W.hotHandles, W.heavy, W.turnHandles] },
  { kind: "bakeware", re: /cake (?:tin|pan|mould|mold)|springform|muffin|cupcake|loaf|bundt|tart|quiche|flan|pie (?:dish|tin|pan)|baking (?:tray|sheet|dish|tin|pan|mat|stone|set)|sheet pan|oven dish|roasting dish|lasagn|gratin|ramekin|souffl|bakeware|cookie|biscuit|pizza (?:stone|tray|pan|crisper|board|peel)|bread baker|cooling rack|mould|mold\b/i, use: "for baking and oven cooking", warnings: [W.hotHandles] },
  { kind: "board", re: /chopping (?:board|block)|cutting board|carving board|bread board|serving board|cheese board|butcher block/i, use: "a stable surface for chopping, carving and serving", warnings: ["Use separate boards (or wash thoroughly in between) for raw meat, fish and ready-to-eat food."], care: undefined },
  { kind: "ovenGlove", re: /oven glove|oven mitt|pot holder|potholder|gauntlet/i, use: "protects hands when handling hot pans and dishes", warnings: [W.ovenGloveWet] },
  { kind: "textile", re: /tea towel|dish ?cloth|kitchen towel|apron|napkin|tablecloth|table ?cloth|runner|placemat|place mat|coaster|cushion/i, use: "for the kitchen and dining table", warnings: [], material: "cotton" },
  { kind: "glassware", re: /wine glass|champagne|flute|coupe|tumbler|highball|whisk(?:e)?y glass|beer glass|cocktail glass|martini|water glass|\bglasses\b|decanter|carafe|aerator|shot glass|pint|goblet|\bglass\b(?!\s*(?:lid|jar|bowl|dish|container|storage|bottle|teapot|teacup|frother|carafe for))/i, use: "for serving and enjoying drinks", warnings: [W.fragile, W.thermal], material: "glass" },
  { kind: "wine", re: /corkscrew|bottle opener|waiter'?s friend|wine opener|wine stopper|bottle stopper|wine cooler|ice bucket|cocktail shaker|jigger|bar spoon|muddler|strainer(?=.*cocktail)/i, use: "for opening, serving and mixing drinks", warnings: [] },
  { kind: "teaware", re: /teapot|tea pot|tea set|tea infuser|tea strainer|teacup|tea cup|tea warmer|kettle|coffee pot|coffee filter|milk jug|creamer|sugar bowl|frother/i, use: "for brewing and serving tea and coffee", warnings: [W.hotHandles] },
  { kind: "crockery", re: /plate|bowl|mug|\bcup\b|cups\b|saucer|dish|platter|egg cup|serving|tableware|dinner set|tray|jug|pitcher|butter dish|gravy|tureen|cake stand/i, use: "for serving and everyday dining", warnings: [W.fragile] },
  { kind: "cutlery", re: /cutlery|flatware|\bfork|\bspoons?\b|teaspoon|tablespoon|chopsticks|salad server|cake server|dessert set/i, use: "for everyday dining and entertaining", warnings: [] },
  { kind: "utensil", re: /spatula|turner|ladle|tongs|whisk|masher|skimmer|slotted|spoon|utensil|press|squeezer|juicer(?!.*electric)|baster|brush|scoop|ricer|sieve|colander|strainer|funnel|measuring|scale|thermometer|timer|rolling pin|mortar|pestle|mill|grinder|salt|pepper|nutcracker|tenderi[sz]er|hammer|skewer|kitchen tool|kitchen set|gadget|shaker|syringe|spout|pourer/i, use: "a handy everyday kitchen tool", warnings: [] },
  { kind: "storage", re: /storage|container|canister|voorraad|jar|lunch ?box|snack ?box|bento|food box|tin\b|bread (?:bin|box)|bottle|flask|thermos|vacuum|dispenser|spice|rack|holder|organi[sz]er|caddy|drainer|dish rack|basket|shelf|hook|rail/i, use: "keeps your kitchen organised and food fresh", warnings: [] },
  { kind: "bin", re: /\bbins?\b|waste|trash|compost|pedal/i, use: "keeps kitchen waste tidy and hygienic", warnings: [W.bin] },
];

function profileFor(title, category) {
  const t = `${title} ${category || ""}`;
  for (const p of PROFILES) if (p.re.test(title)) return p;
  for (const p of PROFILES) if (p.re.test(t)) return p;
  return { kind: "general", use: "for your kitchen", warnings: [] };
}

function extraWarnings(text, materials, kind) {
  const w = [];
  const m = materials.join(" ");
  const cookware = ["pan", "pot", "pressure", "bakeware"].includes(kind);
  if (/non[\s-]?stick|ptfe|teflon|ceramic[\s-]?coat|ceramiclad|hard[\s-]?anodi[sz]ed/i.test(text) && cookware) w.push(W.ptfe);
  if (/glass|crystal|porcelain|stoneware|earthenware|ceramic/.test(m) && (cookware || kind === "teaware" || kind === "crockery")) w.push(W.thermal);
  if (/gold|platinum|silver(?:\s|-)?(?:rim|edge|decor|plated)|lustre|luster/i.test(text) && ["crockery", "teaware", "glassware"].includes(kind)) w.push(W.metalTrim);
  if (/melamine/.test(m)) w.push(W.melamine);
  if (/copper/.test(m) && cookware && !/lined|tin-lined|stainless/i.test(text)) w.push(W.copperAcid);
  if (/alumin/.test(m) && kind === "storage") w.push(W.aluAcid);
  if (/plastic|melamine|acrylic/.test(m) && !cookware && kind !== "utensil") w.push(W.plasticHeat);
  if (/\b(children|child|kids?|baby|toddler|junior)\b/i.test(text)) w.push(W.child);
  if (/\bdigital\b|battery|batteries/i.test(text)) w.push(W.battery);
  if (/enamel|cast iron/.test(m) && (kind === "pot" || kind === "pan")) w.push(W.heavy);
  return w;
}

const uniq = (arr) => [...new Set(arr.filter(Boolean))];
const cap1 = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const CWS_LABEL_KEY = (label) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);

/**
 * @param {object} p
 * @param {string} p.id
 * @param {string} p.title
 * @param {string} [p.category]  source category path ("Pots & Pans / Frying Pans")
 * @param {string} [p.brand]
 * @param {"cws"|"ek"|"madein"|"ikea"} p.source
 * @param {object} [p.cws]       cached Cookware Store page data
 * @param {string} [p.manufacturerDescription]
 * @param {object[]} [p.manufacturerSpecs]
 */
export function kitchenProductDetails(p) {
  const title = stripSuffix(p.title);
  const cws = p.cws && !p.cws.gone ? p.cws : null;
  const mSpecs = cws?.specs?.length ? cws.specs : p.manufacturerSpecs || [];
  const specText = mSpecs.map((s) => `${s.label} ${s.value}`).join(" ");
  const flagText = (cws?.flags || []).join(" ");
  const text = `${title} ${specText} ${flagText} ${p.category || ""}`;

  let profile = profileFor(title, p.category);
  const specMaterial = mSpecs.find((s) => /^material$/i.test(s.label))?.value;
  let materials = detectMaterials(specMaterial ? `${specMaterial}` : title);
  if (!materials.length) materials = detectMaterials(text);
  if (!materials.length && profile.material) materials = [profile.material];
  const primary = materials[0];

  const brand = (cws?.brand || p.brand || mSpecs.find((s) => /^brand$/i.test(s.label))?.value || "").trim() || undefined;

  let specs;
  if (mSpecs.length) {
    specs = mSpecs
      .filter((s) => s.value && s.value.length < 160)
      .map((s) => ({ key: CWS_LABEL_KEY(s.label), label: cap1(s.label), value: s.value }));
    if (brand && !specs.some((s) => s.key === "brand")) specs.unshift({ key: "brand", label: "Brand", value: brand });
  } else {
    specs = [];
    if (brand) specs.push({ key: "brand", label: "Brand", value: brand });
    if (materials.length) specs.push({ key: "material", label: "Material", value: cap1(materials.join(", ")) });
    specs.push(...sizes(title));
  }
  if (cws?.gtin && !specs.some((s) => /ean|gtin|barcode/i.test(s.key))) specs.push({ key: "ean", label: "EAN / barcode", value: cws.gtin });

  const lowerFlags = (cws?.flags || []).map((f) => f.toLowerCase());
  const highlights = uniq((cws?.flags || []).filter((f) => f.length > 12 && f.length < 140)).slice(0, 8);

  const specPower = mSpecs.some((s) => /^(power|wattage|voltage|watts?|mains)\b/i.test(s.label) && !/batter/i.test(s.value));
  const specBattery = mSpecs.some((s) => /batter|rechargeable|usb/i.test(`${s.label} ${s.value}`));
  const batteryDevice = !specPower && (specBattery || (BATTERY_DEVICE.test(title) && /electric|digital|battery|usb|rechargeable/i.test(title)));
  const isElectric = !batteryDevice && (specPower || (ELECTRIC.test(title) && !NOT_APPLIANCE.test(title)));
  const warnings = uniq([...(profile.warnings || []), ...extraWarnings(text, materials, profile.kind)]);
  if (batteryDevice && !warnings.includes(W.battery)) warnings.push(W.battery);
  if (isElectric && profile.kind === "general") profile = { kind: "appliance", use: "an electrical kitchen appliance", warnings: [] };
  if (isElectric) {
    warnings.unshift(W.electricGeneric);
    if (p.source === "ek") warnings.unshift(W.usVoltage);
    else if (p.source === "cws") warnings.push(W.euPlug);
  }

  const dishwasherSafe = lowerFlags.some((f) => /^dishwasher[- ]safe/.test(f)) || /dishwasher[- ]safe\s*(?::\s*)?(?:yes)?$/i.test(specText);
  const notDishwasher = /not dishwasher|hand ?wash only/i.test(text);
  let care = profile.care !== undefined ? profile.care : careFor(primary);
  if (profile.kind === "board" && !care) care = CARE.wood;
  if (care && dishwasherSafe && !notDishwasher && !/cast iron|carbon steel|wood/.test(primary || "")) care = `${care} Dishwasher safe according to the manufacturer.`;
  if (notDishwasher && care && !/not dishwasher/i.test(care)) care = `${care} Not dishwasher safe.`;

  const hobs = mSpecs.find((s) => /suitable for|heat source|hob/i.test(s.label))?.value;
  const howToUse = (() => {
    if (isElectric) return "Read the manufacturer's instruction booklet before first use. Place on a dry, stable surface away from the sink and the edge of the worktop.";
    if (profile.kind === "pan" || profile.kind === "pot")
      return `Wash before first use.${hobs ? ` Suitable for: ${hobs}.` : ""} Heat gradually on a low-to-medium setting and match the burner size to the base of the pan.`;
    if (profile.kind === "bakeware") return "Wash before first use. Grease or line as your recipe requires and place on the middle shelf of a preheated oven.";
    if (/cast iron|carbon steel/.test(primary || "")) return "Wash and dry before first use, then rub with a little oil and heat gently to season.";
    if (profile.kind === "knife") return "Cut on a wooden or plastic board, never on glass, stone or metal. Hone regularly to keep the edge keen.";
    return undefined;
  })();

  const details = {
    source: cws ? "manufacturer" : p.manufacturerDescription ? "manufacturer" : "listing",
    brand,
    form: profile.kind,
    highlights: highlights.length ? highlights : undefined,
    specs: specs.length ? specs : undefined,
    howToUse,
    care,
    warnings: warnings.length ? warnings : undefined,
  };
  for (const k of Object.keys(details)) if (details[k] === undefined) delete details[k];

  const manufacturer = (cws?.description || p.manufacturerDescription || "").trim();
  const description = manufacturer || kitchenDescription(title, { brand, materials, specs, profile });
  return { details, description, electric: isElectric };
}

function kitchenDescription(title, { brand, materials, specs, profile }) {
  const size = specs.filter((s) => ["diameter", "dimensions", "size", "capacity", "pieces"].includes(s.key));
  const sizeText = size
    .map((s) => (s.key === "pieces" ? `${s.value} pieces` : s.key === "capacity" ? `${s.value} capacity` : `${s.value}`))
    .join(", ");
  const parts = [];
  parts.push(`${title}${brand && !title.toLowerCase().includes(brand.toLowerCase()) ? ` by ${brand}` : ""} — ${profile.use}.`);
  if (materials.length) parts.push(`Made from ${materials.join(" and ")}${sizeText ? ` (${sizeText})` : ""}.`);
  else if (sizeText) parts.push(`Size: ${sizeText}.`);
  parts.push("See the specifications, care and safety information below before use.");
  return parts.join(" ");
}
