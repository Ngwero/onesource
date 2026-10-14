/**
 * Cosmetics product information built from manufacturer data (Lookfantastic page cache).
 *
 * Manufacturer description, how-to-use and full INCI ingredients are used verbatim.
 * Warnings are added only when they follow from the product type or from an ingredient
 * that is actually on the INCI list (fragrance allergens, nut oils, retinoids, acids,
 * aerosol propellants, ...).
 */

const stripSuffix = (t) => String(t || "").replace(/\s+–\s+One Source( pick)?\s*$/i, "").trim();

/** EU-declarable fragrance allergens (Regulation (EC) 1223/2009 Annex III). */
const FRAGRANCE_ALLERGENS = [
  ["Amyl cinnamal", /amyl\s?cinnamal\b/i],
  ["Amylcinnamyl alcohol", /amylcinnamyl alcohol/i],
  ["Anise alcohol", /anis(?:e|yl) alcohol/i],
  ["Benzyl alcohol", /benzyl alcohol/i],
  ["Benzyl benzoate", /benzyl benzoate/i],
  ["Benzyl cinnamate", /benzyl cinnamate/i],
  ["Benzyl salicylate", /benzyl salicylate/i],
  ["Cinnamal", /(?<!amyl\s?|hexyl\s?)\bcinnamal\b/i],
  ["Cinnamyl alcohol", /(?<!amyl)cinnamyl alcohol/i],
  ["Citral", /\bcitral\b/i],
  ["Citronellol", /citronellol/i],
  ["Coumarin", /coumarin/i],
  ["Eugenol", /(?<!iso)eugenol/i],
  ["Farnesol", /farnesol/i],
  ["Geraniol", /geraniol/i],
  ["Hexyl cinnamal", /hexyl\s?cinnamal/i],
  ["Hydroxycitronellal", /hydroxycitronellal/i],
  ["Isoeugenol", /isoeugenol/i],
  ["Butylphenyl methylpropional", /butylphenyl methylpropional/i],
  ["Limonene", /limonene/i],
  ["Linalool", /linalool/i],
  ["Methyl 2-octynoate", /methyl 2-octynoate/i],
  ["Alpha-isomethyl ionone", /alpha-?isomethyl ionone/i],
  ["Oak moss extract", /evernia prunastri/i],
  ["Tree moss extract", /evernia furfuracea/i],
];

const OTHER_ALLERGENS = [
  ["Almond (tree nut) oil", /prunus amygdalus|sweet almond/i],
  ["Macadamia (tree nut) oil", /macadamia/i],
  ["Argan (tree nut) oil", /argania spinosa|argan oil/i],
  ["Hazelnut (tree nut)", /corylus (?:avellana|americana)|hazelnut/i],
  ["Walnut (tree nut)", /juglans regia|walnut/i],
  ["Brazil nut (tree nut)", /bertholletia excelsa/i],
  ["Cashew (tree nut)", /anacardium occidentale/i],
  ["Pistachio (tree nut)", /pistacia vera/i],
  ["Shea (tree nut) butter", /butyrospermum parkii|vitellaria paradoxa|shea butter/i],
  ["Coconut derivatives", /cocos nucifera|coconut/i],
  ["Peanut", /arachis hypogaea|peanut/i],
  ["Wheat (gluten)", /triticum (?:vulgare|aestivum)|wheat/i],
  ["Oat", /avena sativa|\boat\b/i],
  ["Soy", /glycine (?:soja|max)|\bsoy/i],
  ["Milk derivatives", /\blac(?:tis)?\b|milk protein|lactose|\bmilk\b/i],
  ["Egg derivatives", /\bovum\b|egg yolk|albumen/i],
  ["Lanolin (wool wax)", /lanolin|adeps lanae/i],
  ["Beeswax / bee products", /cera alba|beeswax|propolis|\bmel\b|honey|royal jelly/i],
  ["Methylisothiazolinone (preservative)", /methyl(?:chloro)?isothiazolinone/i],
  ["Formaldehyde-releasing preservative", /dmdm hydantoin|quaternium-15|imidazolidinyl urea|diazolidinyl urea|bronopol|2-bromo-2-nitropropane/i],
  ["p-Phenylenediamine (hair dye)", /phenylenediamine|toluene-2,5-diamine/i],
  ["Cocamidopropyl betaine", /cocamidopropyl betaine/i],
];

const W = {
  external: "For external use only.",
  eyes: "Avoid contact with eyes. If the product gets into the eyes, rinse immediately and thoroughly with water.",
  irritation: "Stop using and seek medical advice if redness, swelling, itching or irritation develops.",
  children: "Keep out of reach of children.",
  patch: "If you have sensitive skin or allergies, patch test on a small area (e.g. inner arm) 24–48 hours before first use.",
  retinoid: "Contains a retinoid (vitamin A): may cause dryness, peeling or irritation, especially at first. Use in the evening, wear SPF 30+ daily, and do not use if pregnant, trying to conceive or breastfeeding.",
  acids: "Contains exfoliating acids (AHA/BHA) which can make skin more sensitive to the sun — use SPF 30+ daily during use and for a week afterwards. Do not use on broken or irritated skin.",
  salicylicChild: "Contains salicylic acid: not to be used for children under 3 years old.",
  benzoyl: "Contains benzoyl peroxide, which can bleach hair, towels and fabrics.",
  sunscreen: "Apply generously 15 minutes before sun exposure and reapply at least every 2 hours, and after swimming, sweating or towelling. No sunscreen gives 100% protection — avoid the midday sun, wear protective clothing and keep babies and young children out of direct sunlight.",
  aerosol: "Extremely flammable aerosol. Pressurised container: may burst if heated. Keep away from heat, sparks and open flames; protect from sunlight and temperatures above 50 °C. Do not pierce or burn, even after use. Use in a well-ventilated area and avoid inhaling the spray.",
  flammable: "Flammable — keep away from heat, naked flames and cigarettes.",
  fragrance: "Apply to unbroken skin only. Avoid spraying near the eyes or face.",
  hairDye: "Hair colourants can cause severe allergic reactions. Carry out a skin allergy test 48 hours before EVERY use, even if you have used the product before. Do not use if you have a rash, a sensitive or damaged scalp, or have ever reacted to a hair dye or temporary black henna tattoo.",
  nails: "Highly flammable — keep away from flames. Use in a well-ventilated area and avoid contact with skin.",
  selfTan: "Self-tan does not protect against the sun — use a separate sunscreen.",
  lip: "Do not use on broken or cracked lips if irritation develops.",
  tool: "Clean regularly with mild soap or brush cleanser and allow to dry fully. Do not share applicators, to avoid spreading infection.",
  sponge: "Wash after every use and replace every 1–3 months.",
  heatedTool: "Electrical item: keep away from water, unplug after use and let it cool before storing.",
  eyeProduct: "Do not use if you have an eye infection; discard if irritation occurs. Replace mascara and liquid eyeliner 3 months after opening.",
  supplementDose: "Food supplement: do not exceed the recommended daily dose stated on the label.",
  supplementDiet: "Food supplements should not be used as a substitute for a varied, balanced diet and a healthy lifestyle.",
  supplementAdvice: "Consult a doctor or pharmacist before use if you are pregnant, breastfeeding, taking medication or under medical supervision.",
  supplementAllergens: "Check the label for allergens (e.g. soy, milk, fish, shellfish, nuts, gluten) before use.",
  intimate: "For intended (external/intimate) use only, as described by the manufacturer. Strictly for adults aged 18 and over.",
  intimateStop: "Discontinue use if irritation, burning or discomfort occurs; seek medical advice if it persists.",
  intimateCompat: "Check compatibility before use: oil- and silicone-based lubricants can damage latex condoms and silicone toys — use water-based lubricant with these.",
  deviceClean: "Clean before and after every use with warm soapy water or a suitable toy cleaner, and store dry.",
  candle: "Never leave a burning candle unattended. Burn on a stable, heat-resistant surface, away from draughts, curtains and anything flammable, and out of reach of children and pets.",
  candleWick: "Trim the wick to about 5 mm before each use and do not burn for more than 3–4 hours at a time. Stop using when 1 cm of wax remains.",
  homeScent: "Keep out of reach of children and pets. Avoid contact with skin and eyes, do not swallow, and protect furniture and fabrics from spills.",
  homeScentFlammable: "Contains fragrance oils and alcohol: flammable — keep away from heat, sparks and naked flames.",
  ukPlug: "UK plug, 220–240 V — suitable for Uganda's 240 V supply and UK-style (Type G) sockets.",
  electrical: "Electrical item: read the manufacturer's safety instructions before use, keep away from water, unplug after use and before cleaning, and keep the cable out of reach of children.",
};

/** Mains-powered or rechargeable beauty appliances (UK models). */
const ELECTRICAL = /hair ?dryer|straightener|\bstyler\b|air ?styler|air ?wrap|multi-?styler|curl(ing)? (iron|wand|tong)|\btongs?\b|waver|hot brush|\bled\b|light therapy|microcurrent|\bdevice\b|epilator|\bipl\b|shaver|trimmer|clipper|sonic|electric|rechargeable|cordless|\bfridge\b|nail lamp|\buv lamp|facial steamer|\b\d{3,4}\s?w\b/i;

const KIND = [
  ["supplement", /gumm(y|ies)|softgels?|\btablets\b|\d+\s*(x\s*)?(capsules|vegicaps|sachets)|\((\d+ )?capsules\)|vegicaps|\bsachets?\b|nootropic|adaptogen|myvitamins|myprotein|the nue co|dirtea|vida glow|kiki health|revive collagen|dose & co|protein (powder|bar|shake)|marine collagen|collagen (powder|shot|drink|bovine)|superfood powder|greens powder|ashwagandha|supplement(?!.*(serum|shampoo|conditioner|treatment))|multivitamin(?! (cream|serum|masque|power))|vitamin (d3?|b complex|b12)\b(?!.*(cream|serum))|chlorophyll|mushroom (extract|powder|blend)|probiotic (capsules|supplement)|\bbiotics\b|magnesium|maca\b|digestion|immunity|hormone balance|cod liver/i],
  ["intimate", /vibrator|\blelo\b|smile makers|so divine|lubricant|\blube\b|erotic|massage wand|\bwand\b.*(various|vibrat)|pleasure|condom|intimate (wash|gel|moisturi)/i],
  ["candle", /candle/i],
  ["homeScent", /diffuser(?! .*(dryer|hair))|room (spray|mist)|home (fragrance|spray|scent|scenting)|wax melts?|incense|linen (spray|mist)|pillow (spray|mist)|air freshener|car (diffuser|fragrance)|scented (sachet|stone|pearls)|\bpearls\b(?=.*baobab)|baobab collection/i],
  ["textile", /pillow ?case|pillowcase|scrunchie|sleep mask(?!.*(cream|gel|\d+\s?ml))|eye mask(?=.*silk)|\b(mulberry )?silk (scrunchies?|hair ties?|bonnet|turban|wrap)\b|headband|hair wrap|turban|bath ?robe|dressing gown|pyjama|slippers|towel|socks/i],
  ["tool", /\bbrush(es)?\b|sponge|blender\b|applicator|tweezer|sharpener|eyelash curler|curler\b|puff\b|tool\b|mirror|comb\b|bag\b/i],
  ["hairDye", /hair (?:colou?r|dye)|permanent colou?r|root touch/i],
  ["nails", /nail (?:polish|varnish|lacquer|colou?r)|top coat|base coat|remover(?=.*nail)/i],
  ["sunscreen", /\bspf\s?\d+|sun (?:cream|screen|spray|lotion|protect)|sunscreen|uv (?:defen|protect|solutions)|sun oil/i],
  ["fragrance", /eau de (?:parfum|toilette|cologne)|\bparfum\b|perfume|\bedp\b|\bedt\b|cologne|body mist|hair mist|fragrance/i],
  ["selfTan", /self[- ]?tan|tanning (?:drops|mousse|lotion|water)|bronzing (?:drops|water)/i],
  ["eye", /mascara|eyeliner|eye ?liner|eyeshadow|eye shadow|brow|lash|kohl|eye pencil/i],
  ["lip", /\blip(?:stick|gloss| gloss| balm| oil| liner| tint| butter| treatment| mask| scrub| plump| colour| color| paint| stain| crayon)?/i],
  ["deodorant", /deodorant|antiperspirant|\bdeo\b/i],
  ["hair", /shampoo|conditioner|hair (?:mask|oil|serum|spray|cream)|styling|texture spray|wave spray|dry shampoo|leave-in/i],
  ["skincare", /serum|moisturi[sz]|cream|creme|crème|lotion|toner|essence|cleanser|cleansing|face wash|exfoliat|peel|mask|oil|balm|gel|treatment|eye cream|scrub|mist/i],
  ["makeup", /foundation|concealer|powder|primer|blush|bronzer|highlighter|setting spray|tint|palette|cushion|corrector/i],
  ["body", /body|shower|bath|hand (?:cream|wash|balm)|soap|wash\b/i],
  ["set", /\bset\b|\bkit\b|bundle|collection|gift|trio|duo|routine|coffret/i],
];

const TOPICAL = /cream|serum|lotion|balm|\boil\b|spray|mask|masque|wash|shampoo|conditioner|butter|scrub|toner|cleanser|moisturi|soak|bath|deodorant|mist/i;
const INGESTED = /gumm(y|ies)|softgels?|capsules|vegicaps|tablets|sachets|\bpowder\b|\bdrink\b|\bshots?\b|\bbar\b|\bshake\b|\bsupplement\b/i;

export function cosmeticsKind(title) {
  for (const [k, re] of KIND) {
    if (!re.test(title)) continue;
    if (k === "supplement" && TOPICAL.test(title) && !INGESTED.test(title)) continue;
    return k;
  }
  return "other";
}

const uniq = (a) => [...new Set(a.filter(Boolean))];

/** Removes internal codes and lists that the source page repeats back-to-back. */
function cleanInci(text) {
  if (!text) return text;
  let s = text
    .replace(/<\s*ILN\s*\d+\s*>|\[ILN\d+\]|\bILN\d+\b/gi, "")
    .replace(/\s*\\+\s*/g, "/")
    .replace(/\s+/g, " ")
    .trim();
  const head = s.slice(0, 40);
  const again = s.indexOf(head, 40);
  if (again > 0) {
    const first = s.slice(0, again).replace(/[\s.]+$/, "");
    const second = s.slice(again).replace(/[\s.]+$/, "");
    if (second.startsWith(first.slice(0, Math.floor(first.length * 0.9)))) s = `${first}.`;
  }
  return s.replace(/\s+([.,;])/g, "$1");
}
const bullets = (text) =>
  String(text || "")
    .split(/\n|•/)
    .map((s) => s.trim().replace(/^[-–•]\s*/, ""))
    .filter((s) => s.length > 2);

function sizeSpec(title) {
  const m = title.match(/\b(\d+(?:[.,]\d+)?)\s?(ml|g|kg|l|oz|fl\.?\s?oz)\b/i);
  return m ? { key: "size", label: "Size", value: `${m[1].replace(",", ".")} ${m[2].toLowerCase()}` } : null;
}

/**
 * @param {object} p
 * @param {string} p.title
 * @param {string} [p.brand]
 * @param {object} [p.lf]  cached Lookfantastic data ({name, brand, description, sections, image})
 * @returns {{details: object, description: string, complete: boolean, reason?: string}}
 */
export function cosmeticsProductDetails({ title, brand, lf }) {
  const name = stripSuffix(title);
  const kind = cosmeticsKind(name);
  const s = lf && !lf.gone ? lf.sections || {} : {};
  const get = (re) => Object.entries(s).find(([k]) => re.test(k))?.[1];

  const descriptionText = get(/^description$|^about|overview/i) || lf?.description || "";
  const glance = get(/at a glance|key benefits|benefits/i);
  const ingredientBenefits = get(/ingredient benefits|key ingredients/i);
  const how = get(/how to use|directions|application/i)
    ?.replace(/[\u2600-\u27BF\u{1F300}-\u{1FAFF}]\uFE0F?\s*/gu, "")
    .replace(/^\s*•\s*$/gm, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
  const ingredients = cleanInci(get(/full ingredients|ingredients list|^ingredients$/i));
  const lfWarnings = get(/warning|caution|safety/i);

  const inci = ingredients || "";
  const textAll = `${name} ${inci}`;

  const fragranceAllergens = FRAGRANCE_ALLERGENS.filter(([, re]) => re.test(inci)).map(([n]) => n);
  const otherAllergens = OTHER_ALLERGENS.filter(([, re]) => re.test(inci)).map(([n]) => n);
  const allergens = uniq([...otherAllergens, ...fragranceAllergens]);

  const warnings = [];
  if (lfWarnings) warnings.push(...bullets(lfWarnings));
  const electrical = ELECTRICAL.test(name) && !/candle|diffuser refill/i.test(name);
  if (kind === "supplement") {
    warnings.push(W.supplementDose, W.supplementDiet, W.children, W.supplementAdvice, W.supplementAllergens);
  } else if (kind === "intimate") {
    warnings.push(W.intimate, W.intimateStop);
    if (/lubricant|\blube\b|gel|oil|balm|serum/i.test(name)) warnings.push(W.intimateCompat);
    else warnings.push(W.deviceClean);
    warnings.push(W.children);
  } else if (kind === "candle") {
    warnings.push(W.candle, W.candleWick);
  } else if (kind === "homeScent") {
    warnings.push(W.homeScent);
    if (!electrical) warnings.push(W.homeScentFlammable);
  } else if (kind === "tool") {
    warnings.push(/sponge|blender/i.test(name) ? W.sponge : W.tool);
    if (/heated|electric|rechargeable|usb/i.test(name) && !electrical) warnings.push(W.heatedTool);
  } else if (kind === "textile") {
    warnings.push("Follow the care label when washing. Keep small items away from young children.");
  } else if (electrical && kind === "other") {
    // Appliances: the electrical warnings below are the relevant ones.
  } else {
    if (kind === "hairDye") warnings.push(W.hairDye);
    if (/retin(?:ol|al|yl)|retinoate|tretinoin|adapalene/i.test(inci)) warnings.push(W.retinoid);
    if (/glycolic acid|lactic acid|mandelic acid|salicylic acid|gluconolactone|malic acid|tartaric acid|\baha\b|\bbha\b/i.test(textAll) && !/sunscreen/.test(kind)) {
      if (/glycolic|mandelic|salicylic|\baha\b|\bbha\b|peel|exfoliat/i.test(textAll)) warnings.push(W.acids);
    }
    if (/salicylic acid/i.test(inci) && !/shampoo/i.test(name)) warnings.push(W.salicylicChild);
    if (/benzoyl peroxide/i.test(inci)) warnings.push(W.benzoyl);
    if (kind === "sunscreen") warnings.push(W.sunscreen);
    if (kind === "selfTan") warnings.push(W.selfTan);
    if (/butane|propane|isobutane|hydrofluorocarbon|\bhfc\b|dimethyl ether/i.test(inci) || /aerosol/i.test(name)) warnings.push(W.aerosol);
    else if (kind === "fragrance" || /^(?:\s*)(?:alcohol denat|sd alcohol|alcohol)\b/i.test(inci.replace(/^ingredients:\s*/i, ""))) warnings.push(W.flammable);
    if (kind === "fragrance") warnings.push(W.fragrance);
    if (kind === "nails") warnings.push(W.nails);
    if (kind === "eye") warnings.push(W.eyeProduct);
    if (kind === "lip") warnings.push(W.lip);
    if (kind !== "eye" && kind !== "lip") warnings.push(W.external, W.eyes);
    warnings.push(W.irritation, W.patch, W.children);
  }
  if (electrical) warnings.push(W.electrical, W.ukPlug);

  let allergenStatement;
  if (kind !== "tool" && ingredients) {
    const parts = [];
    if (otherAllergens.length) parts.push(`Contains ${otherAllergens.join(", ")}.`);
    if (fragranceAllergens.length) parts.push(`Fragrance allergens: ${fragranceAllergens.join(", ")}.`);
    if (/parfum|fragrance|aroma/i.test(inci) && !fragranceAllergens.length) parts.push("Contains fragrance (parfum).");
    parts.push("If you have a known allergy, check the full ingredients list before use.");
    allergenStatement = parts.join(" ");
  }

  const highlights = uniq([...bullets(glance), ...bullets(ingredientBenefits)]).slice(0, 8);
  const specs = [];
  if (brand || lf?.brand) specs.push({ key: "brand", label: "Brand", value: lf?.brand || brand });
  const sz = sizeSpec(name);
  if (sz) specs.push(sz);

  const details = {
    source: lf && !lf.gone ? "manufacturer" : "listing",
    brand: lf?.brand || brand || undefined,
    form: kind,
    highlights: highlights.length ? highlights : undefined,
    howToUse: how || undefined,
    ingredients: ingredients || undefined,
    allergens: allergens.length ? allergens : undefined,
    allergenStatement,
    warnings: warnings.length ? uniq(warnings) : undefined,
    storage:
      kind === "tool" || kind === "textile" || electrical
        ? undefined
        : kind === "supplement"
          ? "Store in a cool, dry place below 25 °C, out of direct sunlight, with the lid tightly closed."
          : kind === "candle" || kind === "homeScent"
            ? "Store upright in a cool, dry place away from direct sunlight and heat."
            : kind === "fragrance" || kind === "sunscreen" || /aerosol/i.test(name)
          ? "Store below 25 °C, away from direct sunlight and heat. Do not leave in a hot car."
          : "Store in a cool, dry place away from direct sunlight, with the lid closed. Check the period-after-opening symbol (e.g. 12M) on the pack.",
    specs: specs.length ? specs : undefined,
  };
  for (const k of Object.keys(details)) if (details[k] === undefined) delete details[k];

  const noInci = kind === "tool" || kind === "textile" || kind === "candle" || (electrical && kind !== "intimate");
  const complete = noInci ? Boolean(kind === "tool" || descriptionText) : Boolean(ingredients && (how || descriptionText));
  const description = descriptionText
    ? descriptionText.replace(/[ \t]{2,}/g, " ").replace(/ ([,.])/g, "$1").replace(/\s+\n/g, "\n").trim()
    : kind === "tool"
      ? `${name}${details.brand && !name.toLowerCase().includes(details.brand.toLowerCase()) ? ` by ${details.brand}` : ""}. ${W.tool}`
      : `${name}.`;
  return { details, description, complete, reason: complete ? undefined : lf ? "incomplete-manufacturer-info" : "needs-manufacturer-info" };
}
