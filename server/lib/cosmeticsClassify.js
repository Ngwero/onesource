/**
 * Title → Cosmetics aisle classification (Lookfantastic import + aisle moves).
 * Keep aisle ids in sync with src/data/cosmetics.ts and server/lib/aisles.js.
 */
import { HAIR_BRANDS, KEEP_HERE, isFragranceTitle, splitHairBabyMore } from "./cosmeticsAisleSplit.js";

/**
 * Groups outside core cosmetics, each with its own aisle. `null` = not importable:
 * Lookfantastic gift cards / e-gift cards / subscription vouchers are store credit for
 * lookfantastic.com and cannot be fulfilled by One Source.
 */
export const GROUPS = [
  ["lf-gift-card", null, /gift (card|voucher)|\be-?gift\b|\bvoucher\b|subscription/i],
  ["not-a-product", null, /unlimited data|\bsim (card|only)\b|\d+\s?gb for £/i],
  ["beauty-boxes", "kits-bundles", /beauty box|advent calendar|\badvent\b|mystery (edit|box)|\bcalendar\b/i],
  ["supplements-food", "wellness", /gumm(y|ies)|softgels?|\btablets\b|\d+\s*(x\s*)?(capsules|vegicaps|sachets)|\((\d+ )?capsules\)|\bvegicaps\b|\bsachets\b|nootropic|adaptogen|myvitamins|myprotein|the nue co|dirtea|vida glow|kiki health|revive collagen|dose & co|protein (powder|bar|shake)|collagen (powder|shot|drink|bovine|peptides \d)|marine collagen|greens powder|herbal tea|electrolyte|ashwagandha|\bnmn\b|(?<!nutri-)supplement(?!.*(serum|shampoo|conditioner|treatment))|vitamin b complex|\bvitamins\b(?!.*(cream|serum|shampoo|conditioner|mask|oil))|menstrual cup|period (pants|cup)/i],
  ["home-fragrance", "home-fragrance", /candle|baobab collection|reed diffuser|diffuser refill|(oil|bottle|surround|townhouse|aroma|aromatherapy|waterless|botanical|luxury|home|room) diffuser|diffuser \d+\s?ml|home (fragrance|spray|scent|scenting)|room (spray|mist|scent)|wax melts?|incense|scented (sachet|stone)|linen (spray|mist)|pillow (spray|mist)|air freshener|car (diffuser|fragrance)|aroma reeds|\breeds\b|infinite bottle|fragrance oil(?!.*(hair|body|bath))/i],
  ["sexual-wellness", "sexual-wellness", /vibrator|\blelo\b|smile makers|so divine|lubricant|\blube\b|erotic|pleasure|condom|\bvush\b|massage wand|clitoral|kegel|intimacy/i],
  ["clothing-home", "beauty-tech-home", /pyjama|pajama|bath ?robe|dressing gown|slippers|\bsocks\b|t-?shirt|\bmug\b|\bbook\b|blanket|cushion cover|water bottle|tote bag|umbrella|phone case|pillowcase|pillow case|bed sheet|silk turban|sleep mask(?!.*(cream|gel|ml))/i],
  ["appliances", "beauty-tech-home", /beauty fridge|skincare fridge|mini fridge/i],
];

/** First match wins. "hair-baby-more" results are split further by splitHairBabyMore(). */
const AISLE_RULES = [
  ["kits-bundles", /advent calendar|\(worth|worth (over )?£|\bgift ?set\b|\bbundle\b|\bcoffret\b/i],
  ["fragrance", { test: (t) => isFragranceTitle(t) }],
  ["sun-protection", /\bspf\s?\d*|sunscreen|sun ?(cream|lotion|spray|oil|milk|fluid|stick|block|protect)|anthelios|uvmune|after[- ]?sun|\buv (defen|protect|detection)/i],
  ["brushes-tools", /hair ?dryer|air ?styler|air ?wrap|straightener|curling (iron|wand|tong)|curl wand|\btongs?\b|waver|hot (brush|tools?)|\bbrush(es)?\b|hairbrush|detangler(?! spray)|tangle teezer(?!.*spray)|brushworks|(?<!wax )sponge|beauty ?blender|\bpuff\b|eyelash curler|lash curler|heatless curler|tweezer|\bdevice\b|\bled\b|\blight therapy|bonnet|beauty case|press-ons|lash extensions|\bclusters\b|toe wraps|removal clips|blotting|sebo balance papers|replacement heads|foreo(?!.*(serum|cream|mask|cleanser|gel))|microcurrent|face roller|jade roller|gua sha|epilator|\bipl\b|razor|shaver|trimmer|clipper|nail (lamp|file|drill|clippers?)|massager|massage gun|mirror|\bcomb\b|sharpener|applicator|(makeup|wash|cosmetic|cosmetics|toiletry|toiletries|drawstring|box) bag|(?<!refill )pouch|hair (clips?|ties|bands?|grips?|pins?|claws?)|scrunchie|headband|toothbrush|ice roller|derma ?roller|microneedl|cleansing (tool|device)|facial steamer|false lashes|lash (glue|adhesive)|individual lashes/i],
  ["kits-bundles", /\bkit\b|\bset\b|collection|\bduo\b|\btrio\b|routine|essentials|discovery|\bminis\b|travel (set|size kit)|gift\b|\bedit\b(?!ion)/i],
  ["lips", /\blips?\b|lipstick|lip ?(gloss|liner|balm|oil|tint|stain|butter|plumper|colou?r|mask|treatment|care)|lipcolou?r|rouge g\b|kisskiss|benetint/i],
  ["eye-makeup", /mascara|eye ?liner|\bliner\b|eye ?shadow|shadow stick|\bbrows?\b|eyebrow|\blash(es)?\b|kohl|eye pencil|eye ?primer|eye palette/i],
  ["face-makeup", /foundation|concealer|\bpowders?\b(?!.*(hair|shampoo|texturi|wash))|blush|bronzer|bronzing minerals|(?<!eye )contour(?! (gel|cream|serum|sleep))|highlight|luminiz|\bprimer\b|setting (spray|mist)|skin ?tint|cheek|tinted (moisturi|serum|balm|blur)|\bbb\b|\bcc\b|palette|cushion|corrector|perfector|makeup fixing|glow drops|bronzing drops|\bmakeup \d+ ?ml|diamond veil|complexion/i],
  ["hair-baby-more", /shampoo|conditioner|co-?wash|\bhair\b|scalp|\bcurls?\b|styl(ing|er|e cream)|mousse|pomade|\bpaste\b|hairspray|leave-?in|keratin|bond (repair|builder|maintenance)|kbond|olaplex|blow ?dry|heat protect|texturi[sz]|volumi[sz]|frizz|anti-?breakage|split ends|\bwax\b|beard|moustache|shav(e|ing)|\bnails?\b|cuticle|polish|lacquer|top coat|base coat|gel colou?r|toothpaste|mouthwash|dental|teeth|whitening|\bbaby\b|\bkids?\b|\bmasque\b|\bclay\b|dry shampoo|root|\bgloss\b(?=.*(hair|shades|toner))|\btoner\b(?=.*(hair|blonde|brass|purple|silver))|purple|blonde|brass|super cool colou?r|dream (coat|cocktail)|insta-wow|custard|\bbain\b|\bregime\b|blond guard|perfect defense|liss control|prep & wipe|final fix/i],
  ["acne-care", /blemish|\bacne|(?<!dark )\bspots?\b|breakout|clarifying|\bpores?\b|salicylic|benzoyl|tea tree|imperfection|effaclar|anti-?shine|mattifying|master patch|\bbha\b/i],
  ["hair-baby-more", { test: (t) => HAIR_BRANDS.test(t) && !/\b(body|hand|shower|bath|face|facial|lip)\b/i.test(t) }],
  ["body-care", /\bbody\b|\bbath|shower|hand (cream|wash|balm|lotion|care|soap|sanitiser|serum)|hand ?wash|\bhands?\b|\bfoot\b|\bfeet\b|deodorant|antiperspirant|\bdeo\b|roll-?on|(?<!facial |face |liquid facial )\bsoap\b|self[- ]?tan|tanning|\btan\b|tanner|intimate|stretch mark|cellulite|bust|massage (oil|balm|candle)|epsom|\bsalts?\b|bubble|\bdusting\b|talc|hair removal|wax strips|depilat|cuticle|butter\b/i],
  ["cleansers-bars", /cleans|face wash|facial wash|\bwash\b|toner|\btonic\b|micellar|exfoliat|foliant|\bpeel|make-?up remover|\bremover\b|\bscrub\b|\bpolish\b|\bfoam\b|\bbar\b|cleansing|\bsoap/i],
  ["serums-oils", /serum|ampoule|essence|face oil|facial oil|retinol|retinal|vitamin c|\bdrops\b|booster|concentrate|elixir/i],
  ["face-eye-care", /cream|cr[eè]me|moistu?ri[sz]|moisture|\bmask\b|eye (gel|balm|care|patch)|les yeux|liftactiv/i],
  ["serums-oils", /\boils?\b|niacinamide|hyaluronic|\bacids?\b|treatment|solution|peptides?|\bshot\b|complex\b|\+ ?ha\b|arbutin|antiox|recovery|ginseng/i],
  ["face-eye-care", /\bveil\b|\beyes?\b|\bface\b|facial|\bgel\b|\bmist\b|\bbalm\b|fluid|lotion|emulsion|night|\bday\b|hydrat|ageing|aging|wrinkle|firming|lifting|spray|water|skin|repair|renew|radiance|glow|youth|patches|\bpads?\b|soothing|\bsos\b/i],
];

/** Last resort for short or unusual names (e.g. "Medik8 C-Tetra Luxe 30ml", "Flat Lay London … Box Bag"). */
const FALLBACK_RULES = [
  ["hair-baby-more", /nailberry|manucurist|60 seconds/i],
  ["brushes-tools", /stylpro|wetbrush|elizabeth scarlett|flat lay london/i],
  ["kits-bundles", /\bduet\b|\britual\b|heroes|holiday shop|\bedits?\b|perfect partners|mini bites|\+ travel size|\d x \d+\s?ml/i],
  ["body-care", /\bsoak\b|bodytune|neck and cleavage/i],
  ["face-makeup", /sculpt \d|convertible colou?r/i],
  ["eye-makeup", /climax|reloaded|mothership/i],
  ["lips", /plumper|lipglass|lustreglass|gloss bomb|\bgloss\b|lipslique|baton rouge|\brouge\b|idole tint|plump ambition|drama ink/i],
  ["eye-makeup", /pencil|browliner|\bombre\b|\bquad\b|crayon|\bink\b|eyelift|microliner|graphic pen|liquid shadow|falscara|eylure|stencils|dybrow|clutch|pallet|smoky/i],
  ["face-makeup", /illuminat|lowlighter|bronze|blonzer|soleil|the multiple|sculpting stick|tint stick|multi-use|\bblur\b|pearls of powder|glow powder|fixer|spritzer|touche [ée]clat|one step correct|perfecting pearl|beauty pod|starlette|luxe glam compact|double touch|stylo|liquid colou?r|shimmer/i],
  ["hair-care", /\bwigs?\b|lace frontal|\bpony\b|ponytail|\bedges\b|\brinse\b|claymation|quicksand|matt mud|texture dust|flyaway|dramatic effects|thermo-ceramic rollers|elastics|claw clip/i],
  ["brushes-tools", /\bbag\b|\bcase\b|organi[sz]er|cotton|muslin|roundals|\bmitt\b|\bsheets\b|stickers|scissors|\btips\b|\bglue\b|\btape\b|replacement|\btool\b|microwand|nubody|depuffi|stylpro|convertible base|barrel|dryer|\bstyler\b|air (style|power)|toe wrap|kabuki|smoother|tangle tamer|head hugger|sonic head|\bball\b|bond (&|and) seal/i],
  ["face-makeup", /various shades/i],
  ["face-eye-care", /\d+(\.\d+)?\s?(ml|g)\b|sheet masks?|\bmasks\b|sleeping|clearpad|nose strips|patch|micropeel|morning matrix|cocoon|filler|fire & snow/i],
];

/**
 * @returns {{aisle: string, group?: string} | {skip: string}}
 *   group is set for non-core groups (wellness, home fragrance, …)
 */
export function classifyCosmetic(title, breadcrumb = "") {
  const text = title.replace(/fragrance[- ]free|unscented|without fragrance|no fragrance|non-fragranced|oil[- ]free/gi, " ");
  const crumbs = breadcrumb.split(" > ").slice(1, -1).filter((c) => c !== "Brands").join(" ");
  for (const [group, aisle, re] of GROUPS) {
    if (
      group === "supplements-food" &&
      /serum|ceramide|retinoid|cream|lotion|\bmask\b|shampoo|conditioner|\blip|balm|mist|spray|wipe|\btan\b|pro-collagen/i.test(text) &&
      !/\bsupplement\b|tablets|sachets|softgels?|vegicaps/i.test(text)
    ) continue;
    if (!re.test(text)) continue;
    return aisle ? { aisle, group } : { skip: group };
  }
  const pick = (aisle, group) => ({ aisle: aisle === "hair-baby-more" ? splitHairBabyMore(title) : aisle, group });
  // A loose "hair-baby-more" hit (clay, polish, mousse…) that isn't hair, scent, men's,
  // nails, baby or oral care falls through to the skin/body rules below it.
  const loose = (aisle) => aisle === "hair-baby-more" && splitHairBabyMore(title) === "hair-baby-more" && !KEEP_HERE.test(text);
  for (const [aisle, re] of AISLE_RULES) if (re.test(text) && !loose(aisle)) return pick(aisle);
  for (const [aisle, re] of AISLE_RULES) if (crumbs && re.test(crumbs) && !loose(aisle)) return pick(aisle);
  for (const [aisle, re] of FALLBACK_RULES) if (re.test(text)) return pick(aisle, "fallback");
  return pick("hair-baby-more", "fallback");
}
