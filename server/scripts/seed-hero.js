import { requireSupabase } from "../lib/supabase.js";
import {
  DEFAULT_HERO_SLIDES,
  DEFAULT_EXPORT_HERO_SLIDES,
  DEFAULT_KITCHEN_HERO_SLIDES,
  DEFAULT_COSMETICS_HERO_SLIDES,
  DEFAULT_PHARMACY_HERO_SLIDES,
  DEFAULT_ONBOARDING_SLIDES,
} from "../data/defaultHeroSlides.js";

async function main() {
  const db = requireSupabase();

  const rows = [
    ...DEFAULT_HERO_SLIDES,
    ...DEFAULT_EXPORT_HERO_SLIDES,
    ...DEFAULT_KITCHEN_HERO_SLIDES,
    ...DEFAULT_COSMETICS_HERO_SLIDES,
    ...DEFAULT_PHARMACY_HERO_SLIDES,
    ...DEFAULT_ONBOARDING_SLIDES,
  ].map((s) => ({
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

  // Populate missing samples without overwriting slides already edited in Admin.
  const { error } = await db
    .from("hero_slides")
    .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
  if (error) {
    console.error("Seed hero failed:", error.message);
    console.error("Run server/supabase/hero-slides.sql in Supabase SQL Editor first.");
    process.exit(1);
  }

  console.log(
    `Ensured samples exist for homepage (${DEFAULT_HERO_SLIDES.length}), exports (${DEFAULT_EXPORT_HERO_SLIDES.length}), kitchen (${DEFAULT_KITCHEN_HERO_SLIDES.length}), cosmetics (${DEFAULT_COSMETICS_HERO_SLIDES.length}), pharmacy (${DEFAULT_PHARMACY_HERO_SLIDES.length}), and onboarding (${DEFAULT_ONBOARDING_SLIDES.length}).`
  );
}

main();
