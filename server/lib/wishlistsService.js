import { randomBytes } from "crypto";
import { isMissingTable, tableExists } from "./tableDetect.js";

export const WISHLISTS_SETUP_HINT =
  "Run server/supabase/wishlists.sql in the Supabase SQL Editor to enable server wishlists.";

async function ensureDefaultWishlist(db, userId) {
  const { data: existing } = await db
    .from("wishlists")
    .select("*")
    .eq("user_id", userId)
    .eq("name", "Wishlist")
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await db
    .from("wishlists")
    .insert({ user_id: userId, name: "Wishlist" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function getUserWishlist(db, userId) {
  if (!(await tableExists(db, "wishlists"))) {
    return { missing: true, items: [], wishlist: null };
  }
  const wishlist = await ensureDefaultWishlist(db, userId);
  const { data: items, error } = await db
    .from("wishlist_items")
    .select("product_id, created_at")
    .eq("wishlist_id", wishlist.id)
    .order("created_at", { ascending: false });
  if (error) {
    if (isMissingTable(error)) return { missing: true, items: [], wishlist: null };
    throw error;
  }
  return {
    missing: false,
    wishlist: {
      id: wishlist.id,
      name: wishlist.name,
      shareToken: wishlist.share_token,
      isPublic: Boolean(wishlist.is_public),
    },
    items: (items ?? []).map((r) => ({
      productId: r.product_id,
      createdAt: r.created_at,
    })),
  };
}

export async function setWishlistItems(db, userId, productIds) {
  if (!(await tableExists(db, "wishlists"))) {
    return { missing: true };
  }
  const wishlist = await ensureDefaultWishlist(db, userId);
  const ids = [...new Set((productIds ?? []).map(String).filter(Boolean))].slice(0, 500);

  await db.from("wishlist_items").delete().eq("wishlist_id", wishlist.id);
  if (ids.length) {
    const { error } = await db.from("wishlist_items").insert(
      ids.map((product_id) => ({ wishlist_id: wishlist.id, product_id }))
    );
    if (error) throw error;
  }
  return getUserWishlist(db, userId);
}

export async function addWishlistItem(db, userId, productId) {
  if (!(await tableExists(db, "wishlists"))) return { missing: true };
  const wishlist = await ensureDefaultWishlist(db, userId);
  const { error } = await db.from("wishlist_items").upsert(
    { wishlist_id: wishlist.id, product_id: String(productId) },
    { onConflict: "wishlist_id,product_id", ignoreDuplicates: true }
  );
  if (error) throw error;
  return getUserWishlist(db, userId);
}

export async function removeWishlistItem(db, userId, productId) {
  if (!(await tableExists(db, "wishlists"))) return { missing: true };
  const wishlist = await ensureDefaultWishlist(db, userId);
  await db
    .from("wishlist_items")
    .delete()
    .eq("wishlist_id", wishlist.id)
    .eq("product_id", String(productId));
  return getUserWishlist(db, userId);
}

export async function enableWishlistShare(db, userId) {
  if (!(await tableExists(db, "wishlists"))) return { missing: true };
  const wishlist = await ensureDefaultWishlist(db, userId);
  const token = wishlist.share_token || randomBytes(16).toString("hex");
  const { data, error } = await db
    .from("wishlists")
    .update({ share_token: token, is_public: true })
    .eq("id", wishlist.id)
    .select("*")
    .single();
  if (error) throw error;
  return { missing: false, shareToken: data.share_token, isPublic: true };
}

export async function getSharedWishlist(db, token) {
  if (!(await tableExists(db, "wishlists"))) return { missing: true, items: [] };
  const { data: wishlist, error } = await db
    .from("wishlists")
    .select("*")
    .eq("share_token", String(token))
    .eq("is_public", true)
    .maybeSingle();
  if (error) {
    if (isMissingTable(error)) return { missing: true, items: [] };
    throw error;
  }
  if (!wishlist) return { missing: false, items: [], notFound: true };

  const { data: items } = await db
    .from("wishlist_items")
    .select("product_id, created_at")
    .eq("wishlist_id", wishlist.id)
    .order("created_at", { ascending: false });

  return {
    missing: false,
    notFound: false,
    name: wishlist.name,
    items: (items ?? []).map((r) => ({
      productId: r.product_id,
      createdAt: r.created_at,
    })),
  };
}
