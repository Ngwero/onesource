import { asMoneyInteger } from "./money.js";
import { isMissingTable, tableExists } from "./tableDetect.js";

export const DEALS_SETUP_HINT =
  "Run server/supabase/deals.sql in the Supabase SQL Editor to enable timed deals.";

function rowToDeal(row, serverNow = new Date()) {
  const startsAt = row.starts_at ?? row.startsAt;
  const endsAt = row.ends_at ?? row.endsAt;
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const now = serverNow instanceof Date ? serverNow : new Date(serverNow);
  const live =
    row.active !== false &&
    Number.isFinite(start.getTime()) &&
    Number.isFinite(end.getTime()) &&
    now >= start &&
    now < end;

  return {
    id: row.id,
    productId: row.product_id ?? row.productId,
    title: row.title ?? "",
    dealPrice: asMoneyInteger(row.deal_price ?? row.dealPrice),
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    dealOfDay: Boolean(row.deal_of_day ?? row.dealOfDay),
    memberOnly: Boolean(row.member_only ?? row.memberOnly),
    active: row.active !== false,
    live,
    serverNow: now.toISOString(),
    msRemaining: live ? Math.max(0, end.getTime() - now.getTime()) : 0,
  };
}

/** Pure: is a deal live at `now` (UTC Date or ISO string). */
export function isDealLive(deal, now = new Date()) {
  if (!deal || deal.active === false) return false;
  const t = now instanceof Date ? now : new Date(now);
  const start = new Date(deal.startsAt ?? deal.starts_at);
  const end = new Date(deal.endsAt ?? deal.ends_at);
  return Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && t >= start && t < end;
}

export async function listActiveDeals(db, { now = new Date(), includeMemberOnly = true } = {}) {
  if (!(await tableExists(db, "deals"))) return { deals: [], missing: true, serverNow: now.toISOString() };
  const iso = (now instanceof Date ? now : new Date(now)).toISOString();
  let query = db
    .from("deals")
    .select("*")
    .eq("active", true)
    .lte("starts_at", iso)
    .gt("ends_at", iso)
    .order("deal_of_day", { ascending: false })
    .order("ends_at", { ascending: true });
  if (!includeMemberOnly) {
    query = query.eq("member_only", false);
  }
  const { data, error } = await query;
  if (error) {
    if (isMissingTable(error)) return { deals: [], missing: true, serverNow: iso };
    throw error;
  }
  return {
    deals: (data ?? []).map((row) => rowToDeal(row, now)),
    missing: false,
    serverNow: iso,
  };
}

/** Map productId → best (lowest) live deal price. */
export async function dealPriceMap(db, productIds, { now = new Date(), isMember = false } = {}) {
  const ids = [...new Set((productIds ?? []).map(String).filter(Boolean))];
  if (!ids.length) return new Map();
  if (!(await tableExists(db, "deals"))) return new Map();

  const iso = (now instanceof Date ? now : new Date(now)).toISOString();
  const { data, error } = await db
    .from("deals")
    .select("*")
    .eq("active", true)
    .in("product_id", ids)
    .lte("starts_at", iso)
    .gt("ends_at", iso);
  if (error) {
    if (isMissingTable(error)) return new Map();
    throw error;
  }

  const map = new Map();
  for (const row of data ?? []) {
    if (row.member_only && !isMember) continue;
    const price = asMoneyInteger(row.deal_price);
    if (price == null) continue;
    const pid = String(row.product_id);
    const prev = map.get(pid);
    if (prev == null || price < prev) map.set(pid, price);
  }
  return map;
}

/** Overlay deal onto catalogue product rows used for checkout. */
export function applyDealPricesToProducts(products, priceByProductId) {
  if (!(priceByProductId instanceof Map) || priceByProductId.size === 0) {
    return products;
  }
  const list = Array.isArray(products) ? products : [...(products?.values?.() ?? [])];
  return list.map((p) => {
    const deal = priceByProductId.get(String(p.id));
    if (deal == null) return p;
    const catalogue = asMoneyInteger(p.price);
    const dealPrice = asMoneyInteger(deal);
    if (dealPrice == null || catalogue == null || dealPrice >= catalogue) return p;
    return {
      ...p,
      price: dealPrice,
      original_price: p.original_price ?? p.originalPrice ?? catalogue,
      _dealApplied: true,
    };
  });
}

export async function listAllDealsAdmin(db) {
  if (!(await tableExists(db, "deals"))) return { deals: [], missing: true };
  const { data, error } = await db.from("deals").select("*").order("starts_at", { ascending: false });
  if (error) {
    if (isMissingTable(error)) return { deals: [], missing: true };
    throw error;
  }
  const now = new Date();
  return { deals: (data ?? []).map((r) => rowToDeal(r, now)), missing: false };
}

export { rowToDeal };
