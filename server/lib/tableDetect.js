import { isSupabaseConnectionError } from "./supabaseErrors.js";

export function isMissingTable(error) {
  const msg = (error?.message || "").toLowerCase();
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("could not find the table")
  );
}

const cache = new Map();

/** @returns {Promise<boolean>} */
export async function tableExists(db, tableName) {
  if (cache.has(tableName)) return cache.get(tableName);
  const { error } = await db.from(tableName).select("*").limit(1);
  if (!error) {
    cache.set(tableName, true);
    return true;
  }
  if (isMissingTable(error) || isSupabaseConnectionError(error)) {
    cache.set(tableName, false);
    return false;
  }
  // Unknown error — don't poison the cache as "missing"
  throw error;
}

export function clearTableExistsCache() {
  cache.clear();
}
