/**
 * Optional product columns added by supabase/product-details.sql. The API keeps
 * working (no filtering, empty details) until that migration has been run.
 */
let publishedSupported = null;
let checkedAt = 0;
const RECHECK_MS = 5 * 60 * 1000;

export async function hasPublishedColumn(db) {
  if (publishedSupported === true) return true;
  if (publishedSupported === false && Date.now() - checkedAt < RECHECK_MS) return false;
  const { error } = await db.from("products").select("published").limit(1);
  publishedSupported = !error;
  checkedAt = Date.now();
  return publishedSupported;
}
