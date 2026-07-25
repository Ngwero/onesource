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
  "Run server/supabase/kitchen-collage.sql in Supabase SQL Editor, then: cd server && npm run seed:kitchen-collage";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_COLLAGE_PATH = path.join(
  __dirname,
  "../data/kitchen-collage.local.json"
);

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

function rowToCollage(row) {
  if (!row) return { ...DEFAULT_KITCHEN_COLLAGE };
  const fromCols = SLOT_NS.map((n) => ({
    url: row[`image_${n}`] ?? "",
    alt: row[`alt_${n}`] ?? "",
    href: row[`href_${n}`] ?? "",
  }));
  // Prefer JSON images column when present (supports 7 slots without migrations)
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

function collageFromLocalFile(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    id: raw.id || KITCHEN_COLLAGE_ID,
    introTitle: raw.introTitle ?? "",
    introBody: raw.introBody ?? "",
    images: normalizeKitchenCollageImages(raw.images),
    active: raw.active !== false,
    updatedAt: raw.updatedAt || new Date().toISOString(),
    source: "local",
  };
}

async function readLocalCollage() {
  try {
    const text = await fs.readFile(LOCAL_COLLAGE_PATH, "utf8");
    return collageFromLocalFile(JSON.parse(text));
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

function withDefaultImages(collage) {
  const defaults = DEFAULT_KITCHEN_COLLAGE.images;
  const images = normalizeKitchenCollageImages(collage.images).map((img, i) => ({
    url: img.url || defaults[i]?.url || "",
    alt: img.alt || defaults[i]?.alt || "",
    href: img.href || defaults[i]?.href || "",
  }));
  return { ...collage, images };
}

export async function getKitchenCollage(db, { admin = false } = {}) {
  const { data, error } = await db
    .from("kitchen_collage")
    .select("*")
    .eq("id", KITCHEN_COLLAGE_ID)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error) || isSupabaseConnectionError(error)) {
      const local = await readLocalCollage();
      if (local) {
        const collage = withDefaultImages(local);
        if (!admin && !collage.active) {
          return { ...collage, active: false };
        }
        return collage;
      }
      return { ...DEFAULT_KITCHEN_COLLAGE, source: "defaults" };
    }
    throw error;
  }

  if (!data) {
    const local = await readLocalCollage();
    if (local) {
      const collage = withDefaultImages(local);
      if (!admin && !collage.active) {
        return { ...collage, active: false };
      }
      return collage;
    }
    return { ...DEFAULT_KITCHEN_COLLAGE, source: "defaults" };
  }

  const collage = withDefaultImages(rowToCollage(data));
  if (!admin && !collage.active) {
    return { ...collage, active: false };
  }
  return collage;
}

export async function upsertKitchenCollage(db, body) {
  const images = normalizeKitchenCollageImages(
    Array.isArray(body.images) ? body.images : []
  );
  for (let n = 1; n <= KITCHEN_COLLAGE_SLOT_COUNT; n += 1) {
    if (!images[n - 1]?.url) {
      throw new Error(`Image ${n} is required`);
    }
  }

  const row = collageToRow({ ...body, images });

  // Prefer local-friendly write: try supabase with images_json; fall back without it
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
      return writeLocalCollage({
        id: KITCHEN_COLLAGE_ID,
        introTitle: row.intro_title,
        introBody: row.intro_body,
        images,
        active: row.active !== false,
      });
    }
    throw error;
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
      return writeLocalCollage({
        ...DEFAULT_KITCHEN_COLLAGE,
        updatedAt: new Date().toISOString(),
      });
    }
    throw error;
  }

  return withDefaultImages({
    ...DEFAULT_KITCHEN_COLLAGE,
    source: "supabase",
  });
}
