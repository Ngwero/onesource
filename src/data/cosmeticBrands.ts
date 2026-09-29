/** Display brand → title prefixes used by the imported beauty catalogues. */
const BRANDS: Array<[string, string[]]> = [
  ["Amika", ["Amika"]],
  ["Anastasia Beverly Hills", ["Anastasia Beverly Hills"]],
  ["Armani Beauty", ["Giorgio Armani", "Armani beauty", "Armani"]],
  ["BaByliss", ["BaByliss"]],
  ["bareMinerals", ["bareMinerals", "Bare Minerals"]],
  ["Benefit", ["Benefit"]],
  ["Biodance", ["Biodance"]],
  ["Bobbi Brown", ["Bobbi Brown"]],
  ["BYOMA", ["BYOMA"]],
  ["Clabane", ["Clabane"]],
  ["Clarins", ["Clarins"]],
  ["Clinique", ["Clinique"]],
  ["Color Wow", ["Color Wow"]],
  ["D.S. & Durga", ["D.S. & Durga"]],
  ["Danessa Myricks Beauty", ["Danessa Myricks Beauty", "Danessa Myricks"]],
  ["Dior", ["Christian Dior", "DIOR"]],
  ["Dolce&Gabbana", ["Dolce&Gabbana", "Dolce & Gabbana"]],
  ["Drunk Elephant", ["Drunk Elephant"]],
  ["Elizabeth Arden", ["Elizabeth Arden"]],
  ["ESPA", ["ESPA"]],
  ["Estée Lauder", ["Estée Lauder", "Estee Lauder"]],
  ["Fenty Beauty", ["Fenty Beauty"]],
  ["Fenty Skin", ["Fenty Skin"]],
  ["First Aid Beauty", ["First Aid Beauty"]],
  ["Gisou", ["Gisou"]],
  ["Givenchy", ["Givenchy"]],
  ["Hourglass", ["Hourglass"]],
  ["Huda Beauty", ["Huda Beauty", "Huda"]],
  ["Hugo Boss", ["Hugo Boss", "BOSS"]],
  ["ICONIC London", ["ICONIC London"]],
  ["IT Cosmetics", ["IT Cosmetics"]],
  ["K18", ["K18"]],
  ["Kiehl's", ["Kiehl's", "Kiehls"]],
  ["KIKO Milano", ["KIKO Milano", "KIKO"]],
  ["Kylie Cosmetics", ["Kylie Cosmetics"]],
  ["La Roche-Posay", ["La Roche-Posay", "La Roche Posay"]],
  ["Laneige", ["Laneige"]],
  ["Laura Mercier", ["Laura Mercier"]],
  ["Liz Earle", ["Liz Earle"]],
  ["Lola", ["Lola"]],
  ["MAC", ["M.A.C", "MAC"]],
  ["MAKE UP FOR EVER", ["MAKE UP FOR EVER"]],
  ["Marc Jacobs", ["Marc Jacobs"]],
  ["Maria Nila", ["Maria Nila"]],
  ["Milk Makeup", ["Milk Makeup", "Milk"]],
  ["Morphe", ["Morphe"]],
  ["Murad", ["Murad"]],
  ["NARS", ["NARS"]],
  ["Neom", ["Neom"]],
  ["NUXE", ["NUXE"]],
  ["Olaplex", ["Olaplex"]],
  ["Ole Henriksen", ["Ole Henriksen"]],
  ["Origins", ["Origins"]],
  ["OUAI", ["OUAI"]],
  ["Patchology", ["Patchology"]],
  ["Prada", ["Prada", "Pradascope"]],
  ["r.e.m. beauty", ["r.e.m. beauty"]],
  ["Rituals", ["Rituals"]],
  ["Shark", ["Shark"]],
  ["Shiseido", ["Shiseido"]],
  ["Sol de Janeiro", ["Sol de Janeiro"]],
  ["Stila", ["Stila"]],
  ["StriVectin", ["StriVectin"]],
  ["Sulwhasoo", ["Sulwhasoo"]],
  ["Summer Fridays", ["Summer Fridays"]],
  ["Sunday Riley", ["Sunday Riley"]],
  ["Supergoop!", ["Supergoop!"]],
  ["Tom Ford", ["TOM FORD", "Tom Ford"]],
  ["Too Faced", ["Too Faced"]],
  ["Ultra Violette", ["Ultra Violette"]],
  ["Urban Decay", ["Urban Decay"]],
  ["Yves Saint Laurent", ["Yves Saint Laurent", "YSL"]],
];

const PREFIXES = BRANDS.flatMap(([brand, prefixes]) =>
  prefixes.map((prefix) => ({ brand, prefix: prefix.toLowerCase() }))
).sort((a, b) => b.prefix.length - a.prefix.length);

export type CosmeticTitle = { brand: string | null; name: string };

/** Split "DIOR Addict Lip Glow – One Source" into brand + product name. */
export function splitCosmeticTitle(rawTitle: string): CosmeticTitle {
  const title = String(rawTitle ?? "")
    .replace(/\s*[–—-]\s*One Source\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const lower = title.toLowerCase();
  for (const { brand, prefix } of PREFIXES) {
    if (!lower.startsWith(prefix)) continue;
    const next = title.charAt(prefix.length);
    if (next && /[a-z0-9]/i.test(next)) continue;
    const name = title.slice(prefix.length).replace(/^[\s:–—-]+/, "").trim();
    return { brand, name: name || title };
  }
  return { brand: null, name: title };
}
