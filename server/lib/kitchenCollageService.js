import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
  DEFAULT_KITCHEN_COLLAGE,
  KITCHEN_COLLAGE_SLOT_COUNT,
  normalizeKitchenCollageImages,
} from "../data/defaultKitchenCollage.js";
import { isSupabaseConnectionError } from "./supabaseErrors.js";

export const KITCHEN_COLLAGE_ID = "kitchen-inspiration";

export const KITCHEN_COLLAGE_SETUP_HINT =
  "Run server/supabase/kitchen-collage.sql in Supabase SQL Editor (durable table). Until then, collage is stored in the Storage bucket as kitchen/collage.json.";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_COLLAGE_PATH = path.join(
  __dirname,
  "../data/kitchen-collage.local.json"
);

/** Durable fallback when `kitchen_collage` table is not created yet. */
const STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET?.trim() || "images";
const STORAGE_OBJECT = "kitchen/collage.json";

const SLOT_NS = Array.from({ length: KITCHEN_COLLAGE_SLOT_COUNT }, (_, i) => i + 1);

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

function isEphemeralHost() {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_DEPLOYMENT_ID ||
      process.env.RENDER ||
      process.env.FLY_APP_NAME
  );
}

function rowToCollage(row) {
  if (!row) return { ...DEFAULT_KITCHEN_COLLAGE };
  const fromCols = SLOT_NS.map((n) => ({
    url: row[`image_${n}`] ?? "",
    alt: row[`alt_${n}`] ?? "",
    href: row[`href_${n}`] ?? "",
  }));
  // Prefer JSON images column when present (supports 7 slots + startSeconds)
  let images = fromCols;
  if (row.images_json) {
    try {
      const parsed =
        typeof row.images_json === "string"
          ? JSON.parse(row.images_json)
          : row.images_json;
      if (Array.isArray(parsed) && parsed.length) {
        images = normalizeKitchenCollageImages(parsed);
      }
    } catch {
      /* keep column mapping */
    }
  } else {
    images = normalizeKitchenCollageImages(fromCols);
  }
  return {
    id: row.id || KITCHEN_COLLAGE_ID,
    introTitle: row.intro_title ?? "",
    introBody: row.intro_body ?? "",
    images,
    active: row.active !== false,
    updatedAt: row.updated_at,
    source: row._source || "supabase",
  };
}

function collageToRow(body) {
  const images = normalizeKitchenCollageImages(
    Array.isArray(body.images) ? body.images : []
  );
  const row = {
    id: KITCHEN_COLLAGE_ID,
    intro_title: String(body.introTitle ?? body.intro_title ?? "").trim(),
    intro_body: String(body.introBody ?? body.intro_body ?? "").trim(),
    active: body.active !== false,
    images_json: images,
  };
  for (const n of SLOT_NS) {
    const img = images[n - 1] || {};
    // Only write columns 1–5 for older schemas; 6–7 live in images_json
    if (n <= 5) {
      row[`image_${n}`] = String(img.url ?? "").trim();
      row[`alt_${n}`] = String(img.alt ?? "").trim();
      row[`href_${n}`] = String(img.href ?? "").trim();
    }
  }
  return row;
}

function collageFromPayload(raw, source) {
  if (!raw || typeof raw !== "object") return null;
  return {
    id: raw.id || KITCHEN_COLLAGE_ID,
    introTitle: raw.introTitle ?? raw.intro_title ?? "",
    introBody: raw.introBody ?? raw.intro_body ?? "",
    images: normalizeKitchenCollageImages(raw.images),
    active: raw.active !== false,
    updatedAt: raw.updatedAt || raw.updated_at || new Date().toISOString(),
    source,
  };
}

async function readLocalCollage() {
  try {
    const text = await fs.readFile(LOCAL_COLLAGE_PATH, "utf8");
    return collageFromPayload(JSON.parse(text), "local");
  } catch {
    return null;
  }
}

async function writeLocalCollage(collage) {
  const images = normalizeKitchenCollageImages(collage.images);
  const payload = {
    id: collage.id || KITCHEN_COLLAGE_ID,
    introTitle: collage.introTitle ?? "",
    introBody: collage.introBody ?? "",
    images,
    active: collage.active !== false,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(LOCAL_COLLAGE_PATH, JSON.stringify(payload, null, 2), "utf8");
  return { ...payload, source: "local" };
}

async function readStorageCollage(db) {
  const { data, error } = await db.storage
    .from(STORAGE_BUCKET)
    .download(STORAGE_OBJECT);
  if (error || !data) return null;
  try {
    const text = await data.text();
    return collageFromPayload(JSON.parse(text), "storage");
  } catch {
    return null;
  }
}

async function writeStorageCollage(db, collage) {
  const images = normalizeKitchenCollageImages(collage.images);
  const payload = {
    id: collage.id || KITCHEN_COLLAGE_ID,
    introTitle: collage.introTitle ?? "",
    introBody: collage.introBody ?? "",
    images,
    active: collage.active !== false,
    updatedAt: new Date().toISOString(),
  };
  const body = Buffer.from(JSON.stringify(payload, null, 2), "utf8");
  const { error } = await db.storage.from(STORAGE_BUCKET).upload(STORAGE_OBJECT, body, {
    contentType: "application/json",
    upsert: true,
    cacheControl: "60",
  });
  if (error) {
    const err = new Error(error.message || "Failed to save collage to Storage");
    err.cause = error;
    throw err;
  }
  return { ...payload, source: "storage" };
}

/**
 * Fill blank slots from defaults, but never overwrite a saved URL.
 * Preserve startSeconds when present.
 */
function withDefaultImages(collage) {
  const defaults = DEFAULT_KITCHEN_COLLAGE.images;
  const images = normalizeKitchenCollageImages(collage.images).map((img, i) => {
    const next = {
      url: img.url || defaults[i]?.url || "",
      alt: img.alt || defaults[i]?.alt || "",
      href: img.href || defaults[i]?.href || "",
    };
    if (img.startSeconds != null && Number.isFinite(Number(img.startSeconds))) {
      next.startSeconds = Math.floor(Number(img.startSeconds));
    }
    return next;
  });
  return { ...collage, images };
}

function requireImages(images) {
  for (let n = 1; n <= KITCHEN_COLLAGE_SLOT_COUNT; n += 1) {
    if (!images[n - 1]?.url) {
      throw new Error(`Image ${n} is required`);
    }
  }
}

/** Persist outside the SQL table so Railway deploys do not wipe hero images. */
async function persistWithoutTable(db, collage) {
  try {
    const saved = await writeStorageCollage(db, collage);
    // Best-effort local mirror for local/dev machines.
    try {
      await writeLocalCollage(collage);
    } catch {
      /* ignore */
    }
    return saved;
  } catch (storageErr) {
    if (isEphemeralHost()) {
      const err = new Error(
        `Kitchen collage could not be saved permanently (${storageErr.message}). ` +
          `Create the kitchen_collage table or ensure Storage bucket "${STORAGE_BUCKET}" is writable.`
      );
      err.code = "SETUP_REQUIRED";
      throw err;
    }
    // Local/dev: disk file is fine.
    const local = await writeLocalCollage(collage);
    return {
      ...local,
      warning:
        "Saved on this machine only. On Railway, create kitchen_collage or use Storage so deploys keep your images.",
    };
  }
}

async function readWithoutTable(db) {
  const fromStorage = await readStorageCollage(db);
  if (fromStorage) return fromStorage;

  const local = await readLocalCollage();
  if (local) {
    // Promote ephemeral local save into durable Storage before the next deploy.
    try {
      return await writeStorageCollage(db, local);
    } catch {
      return local;
    }
  }

  return { ...DEFAULT_KITCHEN_COLLAGE, source: "defaults" };
}

export async function getKitchenCollage(db, { admin = false } = {}) {
  const { data, error } = await db
    .from("kitchen_collage")
    .select("*")
    .eq("id", KITCHEN_COLLAGE_ID)
    .maybeSingle();

  let collage;
  if (error) {
    if (isMissingTable(error) || isSupabaseConnectionError(error)) {
      collage = withDefaultImages(await readWithoutTable(db));
    } else {
      throw error;
    }
  } else if (!data) {
    // Table exists but empty — still check Storage/local before defaults.
    collage = withDefaultImages(await readWithoutTable(db));
  } else {
    collage = withDefaultImages(rowToCollage(data));
  }

  if (!admin && !collage.active) {
    return { ...collage, active: false };
  }
  return collage;
}

export async function upsertKitchenCollage(db, body) {
  const images = normalizeKitchenCollageImages(
    Array.isArray(body.images) ? body.images : []
  );
  requireImages(images);

  const row = collageToRow({ ...body, images });
  const collagePayload = {
    id: KITCHEN_COLLAGE_ID,
    introTitle: row.intro_title,
    introBody: row.intro_body,
    images,
    active: row.active !== false,
  };

  // Prefer SQL table when available.
  let { data, error } = await db
    .from("kitchen_collage")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();

  if (error && /images_json|column/i.test(error.message || "")) {
    const legacy = { ...row };
    delete legacy.images_json;
    ({ data, error } = await db
      .from("kitchen_collage")
      .upsert(legacy, { onConflict: "id" })
      .select("*")
      .single());
  }

  if (error) {
    if (isMissingTable(error) || isSupabaseConnectionError(error)) {
      return persistWithoutTable(db, collagePayload);
    }
    throw error;
  }

  // Mirror to Storage so a later table drop / rebuild does not lose the hero.
  try {
    await writeStorageCollage(db, collagePayload);
  } catch {
    /* table write already succeeded */
  }

  return rowToCollage(data);
}

export async function seedKitchenCollage(db) {
  const row = collageToRow(DEFAULT_KITCHEN_COLLAGE);
  let { error } = await db.from("kitchen_collage").upsert(row, { onConflict: "id" });

  if (error && /images_json|column/i.test(error.message || "")) {
    const legacy = { ...row };
    delete legacy.images_json;
    ({ error } = await db.from("kitchen_collage").upsert(legacy, { onConflict: "id" }));
  }

  if (error) {
    if (isMissingTable(error) || isSupabaseConnectionError(error)) {
      return persistWithoutTable(db, {
        ...DEFAULT_KITCHEN_COLLAGE,
        updatedAt: new Date().toISOString(),
      });
    }
    throw error;
  }

  try {
    await writeStorageCollage(db, DEFAULT_KITCHEN_COLLAGE);
  } catch {
    /* ignore */
  }

  return withDefaultImages({
    ...DEFAULT_KITCHEN_COLLAGE,
    source: "supabase",
  });
}
