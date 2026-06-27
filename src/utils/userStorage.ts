const HISTORY_PREFIX = "os-browse-history:";
const LIST_PREFIX = "os-saved-list:";

export type HistoryEntry = {
  productId: string;
  viewedAt: string;
};

export function storageUserKey(userId: string | null | undefined): string {
  return userId ?? "guest";
}

export function getBrowsingHistory(userId: string | null | undefined): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(`${HISTORY_PREFIX}${storageUserKey(userId)}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addBrowsingHistory(userId: string | null | undefined, productId: string) {
  const key = `${HISTORY_PREFIX}${storageUserKey(userId)}`;
  const existing = getBrowsingHistory(userId).filter((e) => e.productId !== productId);
  const next: HistoryEntry[] = [
    { productId, viewedAt: new Date().toISOString() },
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
