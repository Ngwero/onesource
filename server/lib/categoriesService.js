import {
  AGRI_CATEGORIES,
  getCategoryById,
  normalizeCategoryId,
} from "../data/categories.js";
import { categoryMatchAliases } from "../data/categories.js";
import { isSupabaseConnectionError } from "./supabaseErrors.js";

function staticCategoriesList() {
  return AGRI_CATEGORIES.map((def, i) => ({
    id: def.id,
    name: def.name,
    icon: def.icon,
    image: undefined,
    group: def.group,
    sortOrder: i,
    active: true,
  }));
}

function isMissingCategoriesTable(error) {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("could not find the table")
  );
}

function isMissingActiveColumn(error) {
  const msg = (error.message || "").toLowerCase();
  return msg.includes("active") && msg.includes("column");
}

export const CATEGORIES_TABLE_SETUP_HINT =
  "Create the categories table: run server/supabase/categories.sql in Supabase SQL Editor, then cd server && npm run seed:categories";

export const CATEGORIES_ACTIVE_COLUMN_HINT =
  "Run server/supabase/categories-active.sql in Supabase SQL Editor to enable deleting categories.";

function rowToCategory(row, def, sortOrder) {
  const active = row?.active !== false;
  return {
    id: def.id,
    name: row?.name ?? def.name,
    icon: row?.icon ?? def.icon,
    image: row?.image?.trim() || undefined,
    group: def.group,
    sortOrder: row?.sort_order ?? sortOrder,
    active,
  };
}

async function fetchCategoryRows(db) {
  let { data: rows, error } = await db
    .from("categories")
    .select("id, name, icon, image, category_group, sort_order, active")
    .order("sort_order", { ascending: true });

  if (error && isMissingActiveColumn(error)) {
    ({ data: rows, error } = await db
      .from("categories")
      .select("id, name, icon, image, category_group, sort_order")
      .order("sort_order", { ascending: true }));
    if (!error && rows) {
      rows = rows.map((r) => ({ ...r, active: true }));
    }
  }

  return { rows, error };
}

/** Merge canonical definitions with Supabase rows (if table exists). */
export async function listCategories(db, { admin = false } = {}) {
  const { rows, error } = await fetchCategoryRows(db);

  if (error) {
    if (isMissingCategoriesTable(error) || isSupabaseConnectionError(error)) {
      return staticCategoriesList();
    }
    throw error;
  }

  const byId = new Map((rows ?? []).map((r) => [r.id, r]));

  const list = AGRI_CATEGORIES.map((def, i) =>
    rowToCategory(byId.get(def.id), def, i)
  );

  if (admin) return list;
  return list.filter((c) => c.active);
}

export async function categoriesTableSupportsDelete(db) {
  const { error } = await db.from("categories").select("active").limit(1);
  if (!error) return true;
  return !isMissingCategoriesTable(error) && !isMissingActiveColumn(error);
}

async function countProductsInCategory(db, categoryId) {
  const aliases = categoryMatchAliases(categoryId);

  const { count, error } = await db
    .from("products")
    .select("*", { count: "exact", head: true })
    .in("category", aliases);

  if (error) throw error;
  return count ?? 0;
}

export async function updateCategoryBanner(db, id, { image }) {
  const def = getCategoryById(id);
  if (!def) throw new Error("Unknown category");

  const { data: existing } = await db
    .from("categories")
    .select("active, image")
    .eq("id", def.id)
    .maybeSingle();

  if (existing?.active === false) {
    throw new Error("Cannot update a deleted category. Restore it first.");
  }

  const payload = {
    id: def.id,
    name: def.name,
    icon: def.icon,
    category_group: def.group,
    sort_order: AGRI_CATEGORIES.findIndex((c) => c.id === def.id),
    image: image?.trim() ? image.trim() : null,
    active: true,
  };

  const { data, error } = await db
    .from("categories")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    if (isMissingCategoriesTable(error)) {
      throw new Error(CATEGORIES_TABLE_SETUP_HINT);
    }
    throw error;
  }
  return rowToCategory(data, def, payload.sort_order);
}

/** Soft-delete: hides category from shop and admin lists. Products are kept. */
export async function deleteCategory(db, id) {
  const def = getCategoryById(id);
  if (!def) throw new Error("Unknown category");

  const productCount = await countProductsInCategory(db, id);

  const { data: existing } = await db
    .from("categories")
    .select("image")
    .eq("id", def.id)
    .maybeSingle();

  const payload = {
    id: def.id,
    name: def.name,
    icon: def.icon,
    category_group: def.group,
    sort_order: AGRI_CATEGORIES.findIndex((c) => c.id === def.id),
    image: existing?.image ?? null,
    active: false,
  };

  const { data, error } = await db
    .from("categories")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    if (isMissingCategoriesTable(error)) {
      throw new Error(CATEGORIES_TABLE_SETUP_HINT);
    }
    if (isMissingActiveColumn(error)) {
      throw new Error(CATEGORIES_ACTIVE_COLUMN_HINT);
    }
    throw error;
  }

  return {
    category: rowToCategory(data, def, payload.sort_order),
    productCount,
    message:
      productCount > 0
        ? `Category hidden. ${productCount} product(s) still use this category.`
        : "Category deleted from shop",
  };
}
