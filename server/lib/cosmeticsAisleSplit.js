/**
 * Splits the old catch-all "hair-baby-more" aisle into fragrance, men's grooming and
 * hair care. Whatever is left (nails, baby, oral care, …) stays in "hair-baby-more".
 * Shared by the Lookfantastic import and scripts/split-hair-baby-more.js.
 */

/** Unambiguous perfume wording. */
const EXPLICIT_SCENT = /eau de (parfum|toilette|cologne)|\beau fra[iî]che\b|\bparfum\b|perfume(?!d (body|dusting|hand|bath|shower))|\bcologne\b|body mist|hair (mist|perfume)|\bedp\b|\bedt\b|extrait|\bprofumo\b|perfume oil|solid perfume/i;
/** Weaker hints, only trusted when the title names no other product type. */
const SCENT_HINT = /\bfragrance\b(?![- ]free)|atomi[sz]er|\babsol(u|ute)\b|\bl'eau\b|\belixir\b|scent (stick|roller)|rollerball/i;
const PRODUCT_TYPE = /cream|serum|treatment|\bmasks?\b|\bmasque\b|wash|lotion|balm|\bgel\b|drops|bronz|moisturi|cleans|shampoo|conditioner|\bspray\b(?!.*(eau|parfum))|\blip|\btan\b|tanning|fondant|soin|blond guard|cicaplasme|\bhuile\b|\boil\b(?! parfum)|duo \d|various shades|plumper|\btint\b|\brouge\b|\bink\b|\bpen\b|pearl|illuminat|g[ée]nifique|\bb5\b|\bstick\b|palette|powder/i;

export const KEEP_HERE = /\bnails?\b|cuticle|manucurist|nailberry|\bessie\b|\bopi\b|\borly\b|mavala|nails inc|prep & wipe|(nail|gel) polish|polish remover|lacquer|top coat|base coat|gel colou?r|manicure|toothpaste|mouthwash|dental|teeth|whitening strips|\btooth|oral care|\bbaby\b|\bbabies\b|\bkids?\b|children|toddler|nappy|bump\b|maternity/i;

const MENS =
  /beard|moustache|mustache|\bshav(e|ing)\b|clearshave|menaji|after ?shave|\bfor men\b|\bmen'?s\b|\bmen\b|\bhomme\b(?!.*(eau de|parfum|toilette|cologne))|bulldog|men expert|barber|grooming|razor|\bpour lui\b/i;

const HAIR =
  /shampoo|conditioner|co-?wash|\bhair\b|scalp|\bcurls?\b|styl(ing|er|e cream)|mousse|pomade|\bpaste\b|hairspray|leave-?in|keratin|bond (repair|builder|maintenance)|kbond|olaplex|blow ?dry|heat protect|texturi[sz]|volumi[sz]|frizz|anti-?breakage|split ends|\bwax\b|dry shampoo|\broots?\b|\bgloss\b|\btoner\b|purple|blonde?|brass|colou?r (mask|depositing|protect)|dream (coat|cocktail)|insta-wow|custard|\bbain\b|masque|\bclay\b|\bedges\b|\bwig\b|\bponytail\b|\bpony\b|extensions?|\brinse\b|\bdust\b|claymation|quicksand|matt mud|flyaway|rollers|\bbraid|\blocs?\b|\btwist\b|\bcurl\b|hydrating milk|leave in|detangl/i;

export const HAIR_BRANDS =
  /moroccanoil|philip kingsley|\bghd\b|k[ée]rastase|redken|olaplex|\bk18\b|color wow|living proof|\bouai\b|briogeo|bumble and bumble|joico|wella|l'or[ée]al professionnel|pureology|nioxin|paul mitchell|\btigi\b|\bkms\b|davines|christophe robin|percy & reed|umberto giannini|aveda|amika|kevin murphy|bleach london|shu uemura|label\.m|virtue|igk|bouclème|curlsmith|cantu|keracare|mielle|dyson chitosan|hanz de fuko|daimon barber|murdock london|l'anza|kerasilk|as i am|camille rose|pattern beauty|aussie|tresemm[ée]|pantene|bed head|hask|denman|tangle teezer|easilocks|plslondon|hairburst/i;

const HAIR_STRONG = /shampoo|conditioner|\bmasque\b|\bbain\b|\bhair\b|scalp|co-?wash|leave-?in|\bcurls?\b|frizz/i;
const SKIN = /\b(face|facial|body|lips?|eyes?|hands?|foot|feet|skin|tan|tanning)\b|\bspf\b|pore|blemish|retexturi|self[- ]tan/i;

/** Fragrance houses whose names often omit "Eau de Parfum" (e.g. "TOM FORD Ombré Leather Reserve 100ml"). */
const FRAGRANCE_HOUSES =
  /tom ford|juliette has a gun|maison margiela|byredo|le labo|\bcreed\b|kilian|d\.s\. & durga|ex nihilo|initio|parfums de marly|xerjoff|montale|mancera|bdk|frederic malle|penhaligon|acqua di parma|ormonde jayne|floral street|kayali|phlur|ellis brooklyn|maison francis kurkdjian|commodity|boadicea|clean reserve|bon parfumeur|zara|azzaro|marc jacobs|issey miyake|givenchy|yves saint laurent|armani|paco rabanne|rabanne|jean paul gaultier|carolina herrera|valentino|prada|burberry|chlo[ée]|gucci|dolce|versace|hugo boss|calvin klein|lanc[oô]me|mugler|viktor|narciso|montblanc|bvlgari|cartier|hermes|herm[eè]s|dior|chanel|ariana grande|billie eilish|sol de janeiro|merchant of venice|floral street/i;

/** @returns {"fragrance"|"mens"|"hair-care"|"hair-baby-more"} */
export function isFragranceTitle(title) {
  const text = String(title || "").replace(/(un|non-?)fragranced|fragrance[- ]free|unscented|without fragrance/gi, " ");
  if (EXPLICIT_SCENT.test(text) && !/shampoo|conditioner|\bmasque\b|hand cream|body (lotion|wash|cream)/i.test(text)) return true;
  if (PRODUCT_TYPE.test(text) || SKIN.test(text) || HAIR_STRONG.test(text) || HAIR_BRANDS.test(text)) return false;
  if (SCENT_HINT.test(text)) return !/\belixir\b/i.test(text) || FRAGRANCE_HOUSES.test(text);
  return FRAGRANCE_HOUSES.test(text) && /\d+\s?ml\b/i.test(text) && !/nail|polish|lacquer|powder|palette|foundation|concealer|mascara|liner|shadow|blush|primer/i.test(text);
}

export function splitHairBabyMore(title) {
  const text = String(title || "").replace(/(un|non-?)fragranced|fragrance[- ]free|unscented|without fragrance/gi, " ");
  const hairy = HAIR_STRONG.test(text);
  if (isFragranceTitle(text)) return "fragrance";
  if (KEEP_HERE.test(text) && !hairy) return "hair-baby-more";
  if (MENS.test(text)) return "mens";
  if (hairy || ((HAIR.test(text) || HAIR_BRANDS.test(text)) && !SKIN.test(text))) return "hair-care";
  return "hair-baby-more";
}
