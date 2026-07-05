import { v4 as uuidv4 } from "uuid";
import { isSupabaseConnectionError } from "./supabaseErrors.js";

export const SUPPLIERS_TABLE_SETUP_HINT =
  "Run server/supabase/suppliers.sql in Supabase SQL Editor";

const STATUSES = new Set(["pending", "approved", "suspended", "rejected"]);

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

function rowToSupplier(row, productCount = 0) {
  return {
    id: row.id,
    businessName: row.business_name,
    contactName: row.contact_name ?? "",
    email: row.email,
    phone: row.phone ?? "",
    location: row.location ?? "",
    description: row.description ?? "",
    logo: row.logo ?? "",
    status: row.status ?? "pending",
    commissionRate: Number(row.commission_rate ?? 15),
    notes: row.notes ?? "",
    productCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseBody(body, { id } = {}) {
  const status = String(body.status ?? "pending").trim().toLowerCase();
  return {
    id: id ?? (body.id?.trim() || uuidv4()),
    business_name: String(body.businessName ?? body.business_name ?? "").trim(),
    contact_name: String(body.contactName ?? body.contact_name ?? "").trim() || null,
    email: String(body.email ?? "").trim().toLowerCase(),
    phone: String(body.phone ?? "").trim() || null,
    location: String(body.location ?? "").trim() || null,
    description: String(body.description ?? "").trim() || null,
    logo: String(body.logo ?? "").trim() || null,
    status: STATUSES.has(status) ? status : "pending",
    commission_rate: Number(body.commissionRate ?? body.commission_rate ?? 15),
    notes: String(body.notes ?? "").trim() || null,
  };
}

function validateSupplier(data, isUpdate = false) {
  const errors = [];
  if (!isUpdate && !data.id) errors.push("id is required");
  if (!data.business_name) errors.push("business name is required");
  if (!data.email) errors.push("email is required");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("valid email is required");
  }
  if (Number.isNaN(data.commission_rate) || data.commission_rate < 0 || data.commission_rate > 100) {
    errors.push("commission rate must be between 0 and 100");
  }
  if (!STATUSES.has(data.status)) errors.push("invalid status");
  return errors;
}

async function attachProductCounts(db, rows) {
  if (!rows?.length) return [];
  const ids = rows.map((r) => r.id);
  const { data: counts, error } = await db
    .from("products")
    .select("supplier_id")
    .in("supplier_id", ids);

  if (error && !isMissingTable(error)) throw error;

  const tally = new Map();
  for (const row of counts ?? []) {
    if (!row.supplier_id) continue;
    tally.set(row.supplier_id, (tally.get(row.supplier_id) ?? 0) + 1);
  }

  return rows.map((row) => rowToSupplier(row, tally.get(row.id) ?? 0));
}

export async function listSuppliers(db, { admin = false, status } = {}) {
  let query = db.from("suppliers").select("*").order("created_at", { ascending: false });

  if (!admin) {
    query = query.eq("status", "approved");
  } else if (status && STATUSES.has(status)) {
    query = query.eq("status", status);
  }

  const { data: rows, error } = await query;

  if (error) {
    if (isMissingTable(error) || isSupabaseConnectionError(error)) {
      return [];
    }
    throw error;
  }

  return attachProductCounts(db, rows ?? []);
}

export async function getSupplier(db, id) {
  const { data: row, error } = await db
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) throw new Error(SUPPLIERS_TABLE_SETUP_HINT);
    throw error;
  }
  if (!row) throw new Error("Supplier not found");

  const [supplier] = await attachProductCounts(db, [row]);
  return supplier;
}

export async function createSupplier(db, body) {
  const data = parseBody(body);
  const errors = validateSupplier(data);
  if (errors.length) throw new Error(errors.join(", "));

  const { data: row, error } = await db
    .from("suppliers")
    .insert(data)
    .select()
    .single();

  if (error) {
    if (isMissingTable(error)) throw new Error(SUPPLIERS_TABLE_SETUP_HINT);
    throw error;
  }
  return rowToSupplier(row, 0);
}

export async function updateSupplier(db, id, body) {
  const data = parseBody(body, { id });
  const errors = validateSupplier(data, true);
  if (errors.length) throw new Error(errors.join(", "));

  const { data: row, error } = await db
    .from("suppliers")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (isMissingTable(error)) throw new Error(SUPPLIERS_TABLE_SETUP_HINT);
    throw error;
  }
  if (!row) throw new Error("Supplier not found");

  const [supplier] = await attachProductCounts(db, [row]);
  return supplier;
}

export async function updateSupplierStatus(db, id, status) {
  const normalized = String(status ?? "").trim().toLowerCase();
  if (!STATUSES.has(normalized)) throw new Error("invalid status");

  const { data: row, error } = await db
    .from("suppliers")
    .update({ status: normalized })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (isMissingTable(error)) throw new Error(SUPPLIERS_TABLE_SETUP_HINT);
    throw error;
  }
  if (!row) throw new Error("Supplier not found");

  const [supplier] = await attachProductCounts(db, [row]);
  return supplier;
}

export async function enrichProductsWithSuppliers(db, products, { admin = false } = {}) {
  const ids = [...new Set(products.map((p) => p.supplierId).filter(Boolean))];
  if (!ids.length) return products;

  let query = db.from("suppliers").select("id, business_name, status").in("id", ids);
  if (!admin) query = query.eq("status", "approved");

  const { data: rows, error } = await query;
  if (error && !isMissingTable(error)) throw error;

  const map = new Map((rows ?? []).map((r) => [r.id, r.business_name]));
  return products.map((p) =>
    p.supplierId && map.has(p.supplierId)
      ? { ...p, supplierName: map.get(p.supplierId) }
      : p
  );
}

export async function deleteSupplier(db, id) {
  const { count, error: countErr } = await db
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("supplier_id", id);

  if (countErr && !isMissingTable(countErr)) throw countErr;
  if ((count ?? 0) > 0) {
    throw new Error("Cannot delete supplier with active products — reassign products first");
  }

  const { data, error } = await db
    .from("suppliers")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    if (isMissingTable(error)) throw new Error(SUPPLIERS_TABLE_SETUP_HINT);
    throw error;
  }
  if (!data?.length) throw new Error("Supplier not found");
  return { message: "Supplier deleted" };
}
