import { v4 as uuidv4 } from "uuid";

export const PACKAGING_TABLE_SETUP_HINT =
  "Run server/supabase/packaging.sql in Supabase SQL Editor";

export const PACKAGING_TYPES = [
  "cooler_bag",
  "paper_bag",
  "crate",
  "box",
  "ice_pack",
  "wrap",
  "label",
  "other",
];

const TYPE_SET = new Set(PACKAGING_TYPES);

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

function rowToMaterial(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type ?? "other",
    sku: row.sku ?? "",
    stockQuantity: Number(row.stock_quantity ?? 0),
    reorderLevel: Number(row.reorder_level ?? 10),
    unitCost: Number(row.unit_cost ?? 0),
    unit: row.unit ?? "each",
    active: row.active !== false,
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lowStock:
      Number(row.stock_quantity ?? 0) > 0 &&
      Number(row.stock_quantity ?? 0) <= Number(row.reorder_level ?? 10),
    outOfStock: Number(row.stock_quantity ?? 0) <= 0,
  };
}

function parseBody(body, { id } = {}) {
  const type = String(body.type ?? "other").trim().toLowerCase();
  return {
    id: id ?? (body.id?.trim() || `pkg-${uuidv4().slice(0, 8)}`),
    name: String(body.name ?? "").trim(),
    type: TYPE_SET.has(type) ? type : "other",
    sku: String(body.sku ?? "").trim() || null,
    stock_quantity: Math.max(0, Math.floor(Number(body.stockQuantity ?? body.stock_quantity ?? 0))),
    reorder_level: Math.max(0, Math.floor(Number(body.reorderLevel ?? body.reorder_level ?? 10))),
    unit_cost: Math.max(0, Number(body.unitCost ?? body.unit_cost ?? 0)),
    unit: String(body.unit ?? "each").trim() || "each",
    active: body.active !== false && body.active !== "false",
    notes: String(body.notes ?? "").trim() || null,
  };
}

function validateMaterial(data) {
  const errors = [];
  if (!data.name) errors.push("name is required");
  if (!TYPE_SET.has(data.type)) errors.push("invalid packaging type");
  if (Number.isNaN(data.stock_quantity) || data.stock_quantity < 0) {
    errors.push("stock quantity must be 0 or more");
  }
  if (Number.isNaN(data.reorder_level) || data.reorder_level < 0) {
    errors.push("reorder level must be 0 or more");
  }
  if (Number.isNaN(data.unit_cost) || data.unit_cost < 0) {
    errors.push("unit cost must be 0 or more");
  }
  return errors;
}

export async function listPackagingMaterials(db, { activeOnly = false, type } = {}) {
  let query = db.from("packaging_materials").select("*").order("name", { ascending: true });
  if (activeOnly) query = query.eq("active", true);
  if (type && TYPE_SET.has(type)) query = query.eq("type", type);

  const { data, error } = await query;
  if (error) {
    if (isMissingTable(error)) {
      const err = new Error(PACKAGING_TABLE_SETUP_HINT);
      err.code = "TABLE_MISSING";
      throw err;
    }
    throw error;
  }
  return (data ?? []).map(rowToMaterial);
}

export async function getPackagingMaterial(db, id) {
  const { data, error } = await db.from("packaging_materials").select("*").eq("id", id).maybeSingle();
  if (error) {
    if (isMissingTable(error)) {
      const err = new Error(PACKAGING_TABLE_SETUP_HINT);
      err.code = "TABLE_MISSING";
      throw err;
    }
    throw error;
  }
  if (!data) {
    const err = new Error("Packaging material not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  return rowToMaterial(data);
}

export async function createPackagingMaterial(db, body) {
  const row = parseBody(body);
  const errors = validateMaterial(row);
  if (errors.length) throw new Error(errors.join("; "));

  const { data, error } = await db.from("packaging_materials").insert(row).select("*").single();
  if (error) {
    if (isMissingTable(error)) throw new Error(PACKAGING_TABLE_SETUP_HINT);
    if (error.code === "23505") throw new Error("A packaging item with this id already exists");
    throw error;
  }
  return rowToMaterial(data);
}

export async function updatePackagingMaterial(db, id, body) {
  const existing = await getPackagingMaterial(db, id);
  const row = parseBody({ ...existing, ...body, id }, { id });
  // merge camelCase existing for parseBody
  const merged = parseBody(
    {
      name: body.name ?? existing.name,
      type: body.type ?? existing.type,
      sku: body.sku ?? existing.sku,
      stockQuantity: body.stockQuantity ?? body.stock_quantity ?? existing.stockQuantity,
      reorderLevel: body.reorderLevel ?? body.reorder_level ?? existing.reorderLevel,
      unitCost: body.unitCost ?? body.unit_cost ?? existing.unitCost,
      unit: body.unit ?? existing.unit,
      active: body.active ?? existing.active,
      notes: body.notes ?? existing.notes,
    },
    { id }
  );
  const errors = validateMaterial(merged);
  if (errors.length) throw new Error(errors.join("; "));

  const { data, error } = await db
    .from("packaging_materials")
    .update(merged)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    if (isMissingTable(error)) throw new Error(PACKAGING_TABLE_SETUP_HINT);
    throw error;
  }
  return rowToMaterial(data);
}

export async function adjustPackagingStock(db, id, delta) {
  const material = await getPackagingMaterial(db, id);
  const next = Math.max(0, material.stockQuantity + Number(delta || 0));
  return updatePackagingMaterial(db, id, { stockQuantity: next });
}

export async function deletePackagingMaterial(db, id) {
  await getPackagingMaterial(db, id);
  const { error } = await db.from("packaging_materials").delete().eq("id", id);
  if (error) {
    if (isMissingTable(error)) throw new Error(PACKAGING_TABLE_SETUP_HINT);
    throw error;
  }
  return { ok: true, id };
}
