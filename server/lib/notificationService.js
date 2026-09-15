import { v4 as uuidv4 } from "uuid";
import { isSupabaseConnectionError } from "./supabaseErrors.js";

const STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET?.trim() || "images";
const STORAGE_PATH = "admin/app-notifications.json";

export const NOTIFICATIONS_SETUP_HINT =
  "Notifications use Supabase Storage (admin/app-notifications.json). Optional table: run server/supabase/app-notifications.sql";

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

function rowToNotification(row) {
  return {
    id: row.id,
    title: row.title ?? "",
    body: row.body ?? "",
    href: row.href ?? row.cta_href ?? "",
    image: row.image || undefined,
    audience: normalizeAudience(row.audience),
    active: row.active !== false,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  };
}

function normalizeAudience(value) {
  const v = String(value || "all").trim().toLowerCase();
  if (v === "fresh" || v === "kitchen") return v;
  return "all";
}

function parseBody(body, { id } = {}) {
  return {
    id: id ?? (body.id?.trim() || uuidv4()),
    title: String(body.title ?? "").trim(),
    body: String(body.body ?? body.message ?? "").trim(),
    href: String(body.href ?? body.link ?? body.ctaHref ?? "").trim(),
    image: body.image?.trim() ? String(body.image).trim() : null,
    audience: normalizeAudience(body.audience),
    active: body.active !== false,
  };
}

function validateNotification(data, isUpdate = false) {
  const errors = [];
  if (!isUpdate && !data.id) errors.push("id is required");
  if (!data.title) errors.push("title is required");
  if (!data.body) errors.push("message body is required");
  return errors;
}

let tableAvailable = null;

async function detectTable(db) {
  if (tableAvailable !== null) return tableAvailable;
  const { error } = await db.from("app_notifications").select("id").limit(1);
  if (!error) {
    tableAvailable = true;
    return true;
  }
  if (isMissingTable(error) || isSupabaseConnectionError(error)) {
    tableAvailable = false;
    return false;
  }
  throw error;
}

async function readStorageStore(db) {
  const { data, error } = await db.storage.from(STORAGE_BUCKET).download(STORAGE_PATH);
  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("not found") || msg.includes("404") || error.statusCode === "404") {
      return [];
    }
    throw new Error(error.message || "Failed to load notifications store");
  }
  const text = await data.text();
  const parsed = JSON.parse(text || "{}");
  const list = Array.isArray(parsed.notifications) ? parsed.notifications : [];
  return list.map(rowToNotification);
}

async function writeStorageStore(db, notifications) {
  const payload = JSON.stringify(
    {
      version: 1,
      updatedAt: new Date().toISOString(),
      notifications,
    },
    null,
    2
  );
  const blob = new Blob([payload], { type: "application/json" });
  const { error } = await db.storage.from(STORAGE_BUCKET).upload(STORAGE_PATH, blob, {
    upsert: true,
    contentType: "application/json",
    cacheControl: "0",
  });
  if (error) throw new Error(error.message || "Failed to save notifications");
}

export async function listNotifications(db, { admin = false } = {}) {
  const useTable = await detectTable(db);
  let notifications;

  if (useTable) {
    const { data: rows, error } = await db
      .from("app_notifications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      if (isMissingTable(error) || isSupabaseConnectionError(error)) {
        tableAvailable = false;
        notifications = await readStorageStore(db);
      } else {
        throw error;
      }
    } else {
      notifications = (rows ?? []).map(rowToNotification);
    }
  } else {
    notifications = await readStorageStore(db);
  }

  notifications.sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

  if (admin) return notifications;
  return notifications.filter((n) => n.active);
}

export async function createNotification(db, body) {
  const data = parseBody(body);
  const errors = validateNotification(data);
  if (errors.length) throw new Error(errors.join("; "));

  const now = new Date().toISOString();
  const notification = rowToNotification({
    ...data,
    created_at: now,
    updated_at: now,
  });

  const useTable = await detectTable(db);
  if (useTable) {
    const { data: row, error } = await db
      .from("app_notifications")
      .insert({
        id: data.id,
        title: data.title,
        body: data.body,
        href: data.href,
        image: data.image,
        audience: data.audience,
        active: data.active,
      })
      .select("*")
      .single();
    if (error) {
      if (isMissingTable(error)) {
        tableAvailable = false;
      } else {
        throw new Error(error.message);
      }
    } else {
      return rowToNotification(row);
    }
  }

  const existing = await readStorageStore(db);
  existing.unshift(notification);
  await writeStorageStore(db, existing);
  return notification;
}

export async function updateNotification(db, id, body) {
  const existingList = await listNotifications(db, { admin: true });
  const current = existingList.find((n) => n.id === id);
  if (!current) throw new Error("Notification not found");

  const data = parseBody(
    {
      ...current,
      ...body,
      title: body.title ?? current.title,
      body: body.body ?? body.message ?? current.body,
      href: body.href ?? body.link ?? current.href,
      image: body.image !== undefined ? body.image : current.image,
      audience: body.audience ?? current.audience,
      active: body.active !== undefined ? body.active : current.active,
    },
    { id }
  );
  const errors = validateNotification(data, true);
  if (errors.length) throw new Error(errors.join("; "));

  const now = new Date().toISOString();
  const updated = rowToNotification({
    ...data,
    created_at: current.createdAt,
    updated_at: now,
  });

  const useTable = await detectTable(db);
  if (useTable) {
    const { data: row, error } = await db
      .from("app_notifications")
      .update({
        title: data.title,
        body: data.body,
        href: data.href,
        image: data.image,
        audience: data.audience,
        active: data.active,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      if (isMissingTable(error)) {
        tableAvailable = false;
      } else if (error.code === "PGRST116") {
        throw new Error("Notification not found");
      } else {
        throw new Error(error.message);
      }
    } else {
      return rowToNotification(row);
    }
  }

  const next = existingList.map((n) => (n.id === id ? updated : n));
  await writeStorageStore(db, next);
  return updated;
}

export async function deleteNotification(db, id) {
  return updateNotification(db, id, { active: false });
}
