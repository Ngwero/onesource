/** Client feature flags — mirrors server FEATURE_* / GET /api/features. */

export type FeatureFlags = {
  wishlists: boolean;
  wishlistsShare: boolean;
  timedDeals: boolean;
  deals: boolean;
  membership: boolean;
  cartUpsell: boolean;
  returns: boolean;
  supportChat: boolean;
  chat: boolean;
  pushNotifications: boolean;
  push: boolean;
  subscriptions: boolean;
  marketplace: boolean;
  sentry: boolean;
};

const VITE_DEFAULTS: Partial<FeatureFlags> = {
  wishlists: import.meta.env.VITE_FEATURE_WISHLISTS !== "0",
  wishlistsShare: import.meta.env.VITE_FEATURE_WISHLISTS_SHARE !== "0",
  timedDeals: import.meta.env.VITE_FEATURE_TIMED_DEALS !== "0" && import.meta.env.VITE_FEATURE_DEALS !== "0",
  membership: import.meta.env.VITE_FEATURE_MEMBERSHIP !== "0",
  cartUpsell: import.meta.env.VITE_FEATURE_CART_UPSELL !== "0",
  returns: import.meta.env.VITE_FEATURE_RETURNS !== "0",
  supportChat: import.meta.env.VITE_FEATURE_SUPPORT_CHAT !== "0" && import.meta.env.VITE_FEATURE_CHAT !== "0",
  pushNotifications: import.meta.env.VITE_FEATURE_PUSH !== "0",
  subscriptions: import.meta.env.VITE_FEATURE_SUBSCRIPTIONS !== "0",
  marketplace: import.meta.env.VITE_FEATURE_MARKETPLACE === "1",
  sentry: Boolean(import.meta.env.VITE_SENTRY_DSN),
};

let cached: FeatureFlags | null = null;
let fetchedAt = 0;

function fromVite(): FeatureFlags {
  const timedDeals = VITE_DEFAULTS.timedDeals !== false;
  const supportChat = VITE_DEFAULTS.supportChat !== false;
  const pushNotifications = VITE_DEFAULTS.pushNotifications !== false;
  return {
    wishlists: VITE_DEFAULTS.wishlists !== false,
    wishlistsShare: VITE_DEFAULTS.wishlistsShare !== false,
    timedDeals,
    deals: timedDeals,
    membership: VITE_DEFAULTS.membership !== false,
    cartUpsell: VITE_DEFAULTS.cartUpsell !== false,
    returns: VITE_DEFAULTS.returns !== false,
    supportChat,
    chat: supportChat,
    pushNotifications,
    push: pushNotifications,
    subscriptions: VITE_DEFAULTS.subscriptions !== false,
    marketplace: Boolean(VITE_DEFAULTS.marketplace),
    sentry: Boolean(VITE_DEFAULTS.sentry),
  };
}

export function getCachedFlags(): FeatureFlags {
  return cached ?? fromVite();
}

export function isFlagEnabled(key: keyof FeatureFlags): boolean {
  return Boolean(getCachedFlags()[key]);
}

export async function loadFeatureFlags(): Promise<FeatureFlags> {
  if (cached && Date.now() - fetchedAt < 60_000) return cached;
  const base = import.meta.env.VITE_API_URL || "/api";
  try {
    const res = await fetch(`${base}/features`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      const f = data.flags ?? {};
      const next: FeatureFlags = {
        ...fromVite(),
        ...f,
        deals: f.deals ?? f.timedDeals ?? fromVite().deals,
        chat: f.chat ?? f.supportChat ?? fromVite().chat,
        push: f.push ?? f.pushNotifications ?? fromVite().push,
      };
      cached = next;
      fetchedAt = Date.now();
      return next;
    }
  } catch {
    /* use vite defaults */
  }
  cached = fromVite();
  fetchedAt = Date.now();
  return cached;
}
