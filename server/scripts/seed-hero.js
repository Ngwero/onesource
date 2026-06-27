import { requireSupabase } from "../lib/supabase.js";
import { DEFAULT_HERO_SLIDES } from "../data/defaultHeroSlides.js";

async function main() {
  const db = requireSupabase();

  const rows = DEFAULT_HERO_SLIDES.map((s) => ({
    id: s.id,
    sort_order: s.sortOrder,
    image: s.image,
    badge: s.badge,
    title: s.title,
    subtitle: s.subtitle,
    cta: s.cta,
    cta_href: s.ctaHref,
    cta2: s.cta2 ?? null,
    cta2_href: s.cta2Href ?? null,
    active: true,
  }));

  const { error } = await db.from("hero_slides").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Seed hero failed:", error.message);
    console.error("Run server/supabase/hero-slides.sql in Supabase SQL Editor first.");
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} hero slides. Edit in Admin → Homepage hero.`);
}

main();
