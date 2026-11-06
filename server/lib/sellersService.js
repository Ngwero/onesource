function isMissing(error) {
  const code = error?.code || error?.cause?.code;
  const msg = String(error?.message || "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("could not find")
  );
}

function missingTableError() {
  const err = new Error("sellers table not installed");
  err.code = "MISSING_TABLE";
  return err;
}

export async function getSellerBySlug(db, slug) {
  const { data, error } = await db
    .from("sellers")
    .select("id, name, slug, bio, commission_rate, active, created_at")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (error) {
    if (isMissing(error)) throw missingTableError();
    throw error;
  }
  return data;
}

export async function listSellers(db, { limit = 40 } = {}) {
  const { data, error } = await db
    .from("sellers")
    .select("id, name, slug, bio, commission_rate, active, created_at")
    .eq("active", true)
    .order("name", { ascending: true })
    .limit(Math.min(limit, 100));
  if (error) {
    if (isMissing(error)) throw missingTableError();
    throw error;
  }
  return data ?? [];
}

/** Aggregate rating placeholder — average of seller_ratings when present. */
export async function getSellerRatingAggregate(db, sellerId) {
  try {
    const { data, error } = await db
      .from("seller_ratings")
      .select("rating")
      .eq("seller_id", sellerId)
      .limit(500);
    if (error) {
      if (isMissing(error)) return { average: null, count: 0, placeholder: true };
      throw error;
    }
    const ratings = (data ?? []).map((r) => Number(r.rating)).filter((n) => Number.isFinite(n));
    if (!ratings.length) return { average: null, count: 0, placeholder: true };
    const average = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    return { average: Math.round(average * 10) / 10, count: ratings.length, placeholder: false };
  } catch (e) {
    if (isMissing(e)) return { average: null, count: 0, placeholder: true };
    throw e;
  }
}

export async function listSellerProducts(db, sellerId, { limit = 24 } = {}) {
  try {
    const { data, error } = await db
      .from("products")
      .select("id, title, price, image, category, in_stock")
      .eq("seller_id", sellerId)
      .limit(Math.min(limit, 48));
    if (error) {
      if (isMissing(error)) return [];
      throw error;
    }
    return data ?? [];
  } catch (e) {
    if (isMissing(e)) return [];
    throw e;
  }
}

export async function createSeller(db, { name, slug, bio, commissionRate = 0.1 }) {
  const row = {
    name: String(name || "").slice(0, 200),
    slug: String(slug || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80),
    bio: bio ? String(bio).slice(0, 2000) : null,
    commission_rate: Math.min(1, Math.max(0, Number(commissionRate) || 0.1)),
    active: true,
  };
  if (!row.name || !row.slug) throw new Error("name and slug are required");
  const { data, error } = await db.from("sellers").insert(row).select("*").single();
  if (error) {
    if (isMissing(error)) throw missingTableError();
    throw error;
  }
  return data;
}
