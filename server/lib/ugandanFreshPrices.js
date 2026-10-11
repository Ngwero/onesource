/**
 * Kampala retail reference prices for fresh produce (UGX, Sept–Oct 2026).
 *
 * Sources: NAMIS / AgroMarketDay (Nakawa, Kalerwe, Owino retail), Farmgain
 * market outlook, and online grocers (Eloica, Vohena, House of Seafood).
 * Online grocers sit ~20–40% above market stalls; FRESH_ONLINE_MARKUP keeps
 * One Source just under them.
 *
 * Each entry prices one or more bases: kg, each, bunch, litre, pack, tray, bottle, jar.
 * First matching rule wins, so specific names come before generic ones.
 */
export const FRESH_ONLINE_MARKUP = 1.15;

/** @type {Array<[RegExp, Record<string, number>]>} */
export const FRESH_REFERENCE = [
  // Drinks & packaged goods
  [/coca-cola|fanta|7up|mirinda|mountain dew|stoney|bushera/i, { bottle: 2000, each: 2000 }],
  [/ribena/i, { bottle: 5000, each: 5000 }],
  [/pringles/i, { each: 12000, pack: 12000 }],
  [/nes ?caf[eé]|instant coffee/i, { kg: 150000, jar: 9000, each: 9000 }],
  [/juice|julice|jiuce/i, { litre: 8000, bottle: 4000, each: 4000, pack: 8000 }],
  [/passion fruit pulp/i, { litre: 12000, kg: 12000, jar: 6000 }],
  [/avo?cado oil|avacodo oil/i, { litre: 60000, bottle: 15000, each: 15000 }],
  [/tomato paste/i, { kg: 14000, tin: 5000, jar: 5000, each: 5000, pack: 5000 }],
  [/pickles/i, { jar: 12000, each: 12000, kg: 24000 }],
  [/fruit jam/i, { jar: 10000, each: 10000, kg: 20000 }],
  [/groundnut paste|peanut butter/i, { kg: 16000, jar: 8000, each: 8000 }],
  [/honey/i, { kg: 25000, jar: 12500, bottle: 12500, each: 12500 }],
  [/chilli sauce|pepper sauce|peri-?peri sauce/i, { bottle: 8000, jar: 8000, each: 8000 }],
  [/chilli paste/i, { jar: 8000, each: 8000, kg: 32000 }],
  [/chilli (flakes|powder)|crushed chilli|paprika/i, { kg: 30000, jar: 6000, pack: 3000 }],
  [/dried .*chillies|sun-dried chillies|dried whole chillies/i, { kg: 25000, pack: 5000 }],
  [/dried|banana chips|processed mangoes/i, { kg: 40000, pack: 6000 }],
  [/frozen avocado/i, { kg: 8000, pack: 8000 }],

  // Dairy & eggs
  [/uht milk/i, { litre: 4500, each: 4500, carton: 4500 }],
  [/milk/i, { litre: 3000, each: 3000, carton: 3000 }],
  [/yoghurt/i, { litre: 8000, each: 4500, pack: 4500 }],
  [/butter/i, { kg: 40000, pack: 10000, each: 10000 }],
  [/cream/i, { litre: 20000, each: 10000, pack: 10000 }],
  [/gouda/i, { kg: 60000, pack: 15000 }],
  [/cottage cheese/i, { kg: 30000, pack: 8000 }],
  [/duck eggs/i, { each: 1500, tray: 40000, pack: 9000 }],
  [/quail eggs/i, { each: 250, tray: 6000, pack: 3000 }],
  [/eggs\b(?!.*garden)/i, { each: 450, tray: 13000, carton: 13000, pack: 5400 }],

  // Poultry
  [/whole chicken/i, { each: 25000, kg: 15000 }],
  [/chicken breast/i, { kg: 25000 }],
  [/chicken thigh/i, { kg: 20000 }],
  [/chicken wing/i, { kg: 18000 }],

  // Meat (kg)
  [/sausage/i, { kg: 22000, pack: 11000 }],
  [/burger patt/i, { kg: 25000, pack: 12500 }],
  [/bacon/i, { kg: 40000, pack: 10000 }],
  [/smoked (beef|pork)/i, { kg: 35000 }],
  [/(beef|pork|lamb) bones/i, { kg: 6000 }],
  [/trotters/i, { kg: 8000 }],
  [/tripe/i, { kg: 10000 }],
  [/pork rinds/i, { kg: 15000, pack: 5000 }],
  [/pork liver/i, { kg: 12000 }],
  [/(goat|lamb|goat meat) liver/i, { kg: 22000 }],
  [/beef (liver|heart)/i, { kg: 16000 }],
  [/beef tongue/i, { kg: 20000 }],
  [/beef fillet/i, { kg: 30000 }],
  [/beef steak/i, { kg: 25000 }],
  [/oxtail/i, { kg: 22000 }],
  [/beef mince|^mince$/i, { kg: 20000 }],
  [/beef/i, { kg: 18000 }],
  [/lamb (chops|backstrap|fillet|shank)/i, { kg: 38000 }],
  [/lamb/i, { kg: 30000, pack: 15000 }],
  [/goat (chops|backstrap|ribs)/i, { kg: 26000 }],
  [/goat|young goat/i, { kg: 22000, pack: 11000 }],
  [/pork (loin|fillet|chops)/i, { kg: 22000 }],
  [/pork belly|pork ribs/i, { kg: 18000 }],
  [/pork/i, { kg: 16000 }],

  // Fish (kg)
  [/tilapia fillet|perch fillet|pearch fillet|fish fillet/i, { kg: 32000 }],
  [/tilapia/i, { kg: 18000, each: 15000, pack: 18000 }],
  [/smoked fish|nile perch smoked/i, { kg: 30000 }],
  [/salted fish/i, { kg: 25000 }],
  [/silver fish/i, { kg: 12000, pack: 6000 }],
  [/nile pe(a)?rch/i, { kg: 17000 }],
  [/cat ?fish/i, { kg: 14000 }],
  [/mackerel/i, { kg: 15000, each: 6000 }],

  // Herbs & spices
  [/basil|mint|rosemary|coriander/i, { bunch: 2000, each: 2000, pot: 6000, kg: 30000, pack: 2000 }],
  [/black pepper/i, { kg: 40000, pack: 4000, jar: 6000 }],
  [/turmeric/i, { kg: 20000, pack: 3000 }],
  [/garlic/i, { kg: 14000, each: 1000, pack: 3000 }],
  [/ginger/i, { kg: 6000, pack: 3000 }],

  // Chillies & peppers
  [/bell pepper|(red|yellow|orange) peppers?$/i, { kg: 12000, each: 2000, pack: 6000 }],
  [/green (bell )?peppers?|^peppers$/i, { kg: 5000, each: 700, pack: 3000 }],
  [/chill|pepper|habanero|jalape|scotch bonnet|piri|serrano/i, { kg: 8000, pack: 3000, punnet: 3000 }],

  // Vegetables
  [/cherry tomato/i, { kg: 12000, punnet: 3500, pack: 3500 }],
  [/vine tomato|beef tomato/i, { kg: 6000, pack: 3000 }],
  [/tomato seedlings/i, { each: 300, tray: 25000 }],
  [/tomato/i, { kg: 3500, pack: 3500 }],
  [/onion sets/i, { kg: 15000, pack: 5000 }],
  [/red onion/i, { kg: 4500, pack: 4500 }],
  [/onion/i, { kg: 4000, pack: 4000 }],
  [/red cabbage/i, { each: 5000, kg: 3500 }],
  [/cabbage/i, { each: 2500, kg: 1500 }],
  [/carrot/i, { kg: 3000, pack: 3000 }],
  [/baby spinach|salad leaves/i, { kg: 25000, pack: 5000 }],
  [/spinach|kale|nakati|amaranth|bugga|malakwang/i, { bunch: 1500, kg: 5000, pack: 1500 }],
  [/lettuce/i, { each: 3000 }],
  [/broccoli/i, { each: 6000, kg: 12000 }],
  [/courgette/i, { kg: 6000, each: 1500 }],
  [/garden eggs/i, { kg: 4000, pack: 3000 }],
  [/snow peas|sugar snap/i, { kg: 12000, pack: 4000 }],
  [/french beans|fine beans/i, { kg: 6000, pack: 3000 }],
  [/broad beans/i, { kg: 8000, pack: 4000 }],
  [/sweet ?corn/i, { each: 700, kg: 2500 }],

  // Fruit
  [/organic apples|apples/i, { kg: 14000, each: 2000, pack: 10000 }],
  [/pears/i, { kg: 16000, each: 2000 }],
  [/grapefruit/i, { each: 2500, kg: 6000 }],
  [/strawberr/i, { kg: 30000, punnet: 12000, pack: 8000 }],
  [/raspberr|blueberr/i, { kg: 80000, punnet: 10000, pack: 10000 }],
  [/easy peelers|tangerine|mandarin/i, { kg: 6000, each: 500, pack: 4000 }],
  [/orange/i, { kg: 3500, each: 500, pack: 3500 }],
  [/lemon/i, { kg: 6000, each: 400, pack: 2500 }],
  [/avocado|avacodo/i, { each: 1000, kg: 4000, pack: 2000 }],
  [/apple mango|kent mango/i, { each: 1500, kg: 4000 }],
  [/mango|mnago/i, { each: 1000, kg: 3000, pack: 3000 }],
  [/pineapple/i, { each: 3500, kg: 2500, pack: 3500 }],
  [/water ?melon slice/i, { each: 1500, pack: 3000 }],
  [/water ?melon/i, { each: 9000, kg: 2000 }],
  [/passion/i, { kg: 6000, each: 300, pack: 3000, punnet: 3000 }],
  [/papaya|paw paw/i, { each: 3500, kg: 2500 }],
  [/jackfruit/i, { each: 15000, kg: 3000 }],
  [/matooke/i, { bunch: 30000, kg: 1800 }],
  [/banana/i, { bunch: 7000, kg: 4000, each: 300 }],
  [/sugarcane/i, { each: 2000, stalk: 2000 }],

  // Roots & tubers
  [/smashed potato/i, { kg: 8000, pack: 4000 }],
  [/sweet potato/i, { kg: 2000 }],
  [/potato/i, { kg: 2500 }],
  [/cassava flour/i, { kg: 2800 }],
  [/cassava/i, { kg: 2000 }],
  [/yam/i, { kg: 4000 }],
  [/beetroot/i, { kg: 5000, pack: 2500 }],

  // Grains, legumes, nuts
  [/maize seed|bean seeds/i, { kg: 10000 }],
  [/maize flour/i, { kg: 3000 }],
  [/maize/i, { kg: 1500, each: 700 }],
  [/wheat flour/i, { kg: 7500 }],
  [/rice/i, { kg: 5500 }],
  [/millet/i, { kg: 3500 }],
  [/sorghum/i, { kg: 2500 }],
  [/barley/i, { kg: 4000 }],
  [/black beans/i, { kg: 7000 }],
  [/chickpeas|lentils/i, { kg: 9000 }],
  [/cowpeas/i, { kg: 5500 }],
  [/soybeans/i, { kg: 5000 }],
  [/beans/i, { kg: 5500 }],
  [/groundnuts|peanuts/i, { kg: 8000 }],
  [/cashew/i, { kg: 45000 }],
  [/walnuts/i, { kg: 60000 }],
  [/sesame/i, { kg: 8000 }],
  [/sunflower seeds/i, { kg: 10000 }],

  // Coffee, tea, cocoa
  [/raw cocoa beans/i, { kg: 12000 }],
  [/cocoa powder/i, { kg: 32000, pack: 8000 }],
  [/green tea/i, { kg: 40000, pack: 6000 }],
  [/tea leaves/i, { kg: 20000, pack: 5000 }],
  [/robusta/i, { kg: 30000, pack: 8000 }],
  [/coffee/i, { kg: 40000, pack: 10000 }],

  // Farm inputs, feeds, flowers, raw materials
  [/layer mash|poultry mash/i, { kg: 2000 }],
  [/dairy meal/i, { kg: 1500 }],
  [/pig grower/i, { kg: 1800 }],
  [/npk/i, { kg: 4500 }],
  [/organic fertiliser/i, { kg: 1200 }],
  [/pesticide/i, { litre: 30000, bottle: 30000, each: 30000 }],
  [/roses/i, { bunch: 25000, each: 2500 }],
  [/lilies/i, { bunch: 30000, each: 4000 }],
  [/orchids/i, { each: 60000, pot: 60000, pack: 60000 }],
  [/sunflowers/i, { bunch: 20000, each: 3000 }],
  [/cotton lint/i, { kg: 6500 }],
  [/sisal/i, { kg: 3500 }],
];

const WEIGHT_RE = /(\d+(?:\.\d+)?)\s*(kg|g)\b/i;
const VOLUME_RE = /(\d+(?:\.\d+)?)\s*(l|ml)\b/i;
const MULTI_RE = /(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/i;
const COUNT_RE = /(?:per\s+)?(\d+)\s*(?:pack|cobs|sticks|stalks)?\s*$/i;

function weightKg(n, unit) {
  return unit.toLowerCase() === "kg" ? n : n / 1000;
}

function volumeL(n, unit) {
  return unit.toLowerCase() === "l" ? n : n / 1000;
}

/**
 * Market price for one listing, or null when no reference rule matches.
 * @param {{ title: string, unit?: string }} product
 */
export function freshMarketPrice({ title, unit }) {
  const name = String(title || "").replace(/\s*–.*$/, "").trim();
  const u = String(unit || "").toLowerCase().trim();
  const rule = FRESH_REFERENCE.find(([re]) => re.test(name));
  if (!rule) return null;
  const ref = rule[1];
  const kgPrice = ref.kg;

  const multi = u.match(MULTI_RE);
  if (multi) {
    const qty = Number(multi[1]) * Number(multi[2]);
    const unitName = multi[3].toLowerCase();
    if ((unitName === "g" || unitName === "kg") && kgPrice) return kgPrice * weightKg(qty, unitName);
    if (ref.litre) return ref.litre * volumeL(qty, unitName);
  }

  const weight = u.match(WEIGHT_RE);
  if (weight) {
    const kg = weightKg(Number(weight[1]), weight[2]);
    if (kgPrice) return kgPrice * kg;
    if (ref.each) return ref.each * Math.max(1, Math.round(kg * 2));
  }

  const volume = u.match(VOLUME_RE);
  if (volume) {
    const litres = volumeL(Number(volume[1]), volume[2]);
    if (ref.litre) return ref.litre * litres;
    if (ref.bottle) return ref.bottle * Math.max(1, litres / 0.5);
    if (ref.each) return ref.each;
  }

  for (const base of ["bunch", "tray", "carton", "punnet", "bottle", "jar", "tin", "pot", "stalk"]) {
    if (u.includes(base) && ref[base]) return ref[base];
  }
  if (/litre/.test(u) && ref.litre) return ref.litre;

  const count = u.match(COUNT_RE);
  if (count && Number(count[1]) > 1) {
    const n = Number(count[1]);
    if (ref.each) return ref.each * n;
    if (ref.pack) return ref.pack * Math.ceil(n / 3);
  }

  if (/each|piece|cup/.test(u) || u === "") {
    if (ref.each) return ref.each;
    if (ref.bunch) return ref.bunch;
    if (kgPrice) return kgPrice * 0.5;
  }

  if (/pack|box|bundle|bag|bottle|jar|tin|tray|carton|punnet|bunch/.test(u)) {
    if (ref.pack) return ref.pack;
    if (ref.each) return ref.each * 3;
    if (ref.bunch) return ref.bunch;
    if (kgPrice) return kgPrice * 0.5;
  }

  return kgPrice ?? ref.each ?? ref.pack ?? null;
}

/** Quality cues and sack sizes shift price a little around the market rate. */
export function freshQualityFactor(title, unit = "") {
  const t = String(title || "");
  const weight = String(unit).match(WEIGHT_RE);
  const sackKg = weight ? weightKg(Number(weight[1]), weight[2]) : 0;
  let factor = 1;
  if (/premium|export|organic|jumbo|kent|hass|fillet/i.test(t)) factor *= 1.12;
  if (/bulk|family pack|value|wholesale|catering/i.test(t)) factor *= 0.92;
  if (sackKg >= 10) factor *= 0.9;
  return factor;
}
