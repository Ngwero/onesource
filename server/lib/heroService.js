import { v4 as uuidv4 } from "uuid";
import { DEFAULT_HERO_SLIDES } from "../data/defaultHeroSlides.js";
import { isSupabaseConnectionError } from "./supabaseErrors.js";

function isMissingTable(error) {
  const msg = (error?.message || "").toLowerCase();
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("could not find the table")
  );
}

export const HERO_TABLE_SETUP_HINT =
  "Run server/supabase/hero-slides.sql in Supabase SQL Editor, then: cd server && npm run seed:hero";

function rowToSlide(row) {
  return {
    id: row.id,
    sortOrder: row.sort_order ?? 0,
    image: row.image,
    badge: row.badge ?? "",
    title: row.title,
    subtitle: row.subtitle ?? "",
    cta: row.cta ?? "Shop now",
    ctaHref: row.cta_href ?? "/categories",
    cta2: row.cta2 || undefined,
    cta2Href: row.cta2_href || undefined,
    active: row.active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listHeroSlides(db, { admin = false } = {}) {
  const { data: rows, error } = await db
    .from("hero_slides")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    if (isMissingTable(error) || isSupabaseConnectionError(error)) {
      return admin
        ? DEFAULT_HERO_SLIDES
        : DEFAULT_HERO_SLIDES.filter((s) => s.active);
    }
    throw error;
  }

  const slides = (rows ?? []).map(rowToSlide);
  if (slides.length === 0) {
    return admin
      ? DEFAULT_HERO_SLIDES
      : DEFAULT_HERO_SLIDES.filter((s) => s.active);
  }

  if (admin) return slides;
  return slides.filter((s) => s.active);
}

function parseBody(body, { id } = {}) {
  return {
    id: id ?? (body.id?.trim() || uuidv4()),
    sort_order: Number(body.sortOrder ?? body.sort_order ?? 0),
    image: String(body.image ?? "").trim(),
    badge: String(body.badge ?? "").trim(),
    title: String(body.title ?? "").trim(),
    subtitle: String(body.subtitle ?? "").trim(),
    cta: String(body.cta ?? "Shop now").trim(),
    cta_href: String(body.ctaHref ?? body.cta_href ?? "/categories").trim(),
    cta2: body.cta2?.trim() ? String(body.cta2).trim() : null,
    cta2_href: body.cta2Href?.trim() || body.cta2_href?.trim() || null,
    active: body.active !== false,
  };
}

function validateSlide(data, isUpdate = false) {
  const errors = [];
  if (!isUpdate && !data.id) errors.push("id is required");
  if (!data.image) errors.push("image is required");
  if (!data.title) errors.push("title is required");
  if (!data.cta) errors.push("cta is required");
  if (!data.cta_href) errors.push("cta link is required");
  if (Number.isNaN(data.sort_order)) errors.push("sort order must be a number");
  return errors;
}

export async function createHeroSlide(db, body) {
  const data = parseBody(body);
  const errors = validateSlide(data);
  if (errors.length) throw new Error(errors.join(", "));

  const { data: row, error } = await db
    .from("hero_slides")
    .insert(data)
    .select()
    .single();

  if (error) {
    if (isMissingTable(error)) throw new Error(HERO_TABLE_SETUP_HINT);
    throw error;
  }
  return rowToSlide(row);
}

export async function updateHeroSlide(db, id, body) {
  const data = parseBody(body, { id });
  const errors = validateSlide(data, true);
  if (errors.length) throw new Error(errors.join(", "));

  const { data: row, error } = await db
    .from("hero_slides")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (isMissingTable(error)) throw new Error(HERO_TABLE_SETUP_HINT);
    throw error;
  }
  if (!row) throw new Error("Hero slide not found");
  return rowToSlide(row);
}

export async function deleteHeroSlide(db, id) {
  const { data, error } = await db
    .from("hero_slides")
    .update({ active: false })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (isMissingTable(error)) throw new Error(HERO_TABLE_SETUP_HINT);
    throw error;
  }
  if (!data) throw new Error("Hero slide not found");
  return { message: "Hero slide removed from homepage" };
}
