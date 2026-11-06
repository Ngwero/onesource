import type { ShopMode } from "./shopMode";
import { shopModeForProductId } from "./shopMode";

const HISTORY_PREFIX = "os-browse-history:";
const LIST_PREFIX = "os-saved-list:";

export type HistoryEntry = {
  productId: string;
  viewedAt: string;
  /** Shop the product belongs to; older entries may omit this and are inferred from id. */
  shop?: ShopMode;
};

export function storageUserKey(userId: string | null | undefined): string {
  return userId ?? "guest";
}

function normalizeHistoryEntry(entry: HistoryEntry): HistoryEntry {
  const productId = String(entry.productId ?? "");
  if (!productId) return entry;
  return {
    productId,
    viewedAt: entry.viewedAt || new Date(0).toISOString(),
    shop: entry.shop ?? shopModeForProductId(productId),
  };
}

export function getBrowsingHistory(userId: string | null | undefined): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(`${HISTORY_PREFIX}${storageUserKey(userId)}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => e && typeof e.productId === "string" && e.productId)
      .map(normalizeHistoryEntry);
  } catch {
    return [];
  }
}

/** Recently viewed entries for one shop home (Fresh / Kitchen / Cosmetics / Pharmacy). */
export function getBrowsingHistoryForShop(
  userId: string | null | undefined,
  shop: ShopMode,
): HistoryEntry[] {
  return getBrowsingHistory(userId).filter((e) => (e.shop ?? shopModeForProductId(e.productId)) === shop);
}

export function addBrowsingHistory(
  userId: string | null | undefined,
  productId: string,
  shop?: ShopMode,
) {
  const key = `${HISTORY_PREFIX}${storageUserKey(userId)}`;
  const resolvedShop = shop ?? shopModeForProductId(productId);
  const existing = getBrowsingHistory(userId).filter((e) => e.productId !== productId);
  const next: HistoryEntry[] = [
    { productId, viewedAt: new Date().toISOString(), shop: resolvedShop },
    ...existing,
  ].slice(0, 24);
  localStorage.setItem(key, JSON.stringify(next));
}

export function getSavedList(userId: string | null | undefined): string[] {
  try {
    const raw = localStorage.getItem(`${LIST_PREFIX}${storageUserKey(userId)}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setSavedList(userId: string | null | undefined, productIds: string[]): void {
  const key = `${LIST_PREFIX}${storageUserKey(userId)}`;
  localStorage.setItem(key, JSON.stringify(productIds));
  window.dispatchEvent(new Event("onesource-saved"));
}

export function toggleSavedListItem(userId: string | null | undefined, productId: string): boolean {
  const key = `${LIST_PREFIX}${storageUserKey(userId)}`;
  const set = new Set(getSavedList(userId));
  if (set.has(productId)) {
    set.delete(productId);
  } else {
    set.add(productId);
  }
  localStorage.setItem(key, JSON.stringify([...set]));
  window.dispatchEvent(new Event("onesource-saved"));
  return set.has(productId);
}

export function removeSavedListItem(userId: string | null | undefined, productId: string): void {
  setSavedList(
    userId,
    getSavedList(userId).filter((id) => id !== productId)
  );
}

export function isInSavedList(userId: string | null | undefined, productId: string): boolean {
  return getSavedList(userId).includes(productId);
}

/** Merge guest saved items into a signed-in account, then clear the guest list. */
export function mergeGuestSavedListIntoUser(userId: string): void {
  const guestKey = `${LIST_PREFIX}guest`;
  const guestRaw = localStorage.getItem(guestKey);
  if (!guestRaw) return;

  try {
    const guest = JSON.parse(guestRaw) as string[];
    if (!Array.isArray(guest) || guest.length === 0) {
      localStorage.removeItem(guestKey);
      return;
    }
    const merged = new Set([...getSavedList(userId), ...guest]);
    setSavedList(userId, [...merged]);
    localStorage.removeItem(guestKey);
  } catch {
    localStorage.removeItem(guestKey);
  }
}
