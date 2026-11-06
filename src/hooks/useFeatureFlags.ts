import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export type FeatureFlags = Record<string, boolean>;

let cached: FeatureFlags | null = null;
let inflight: Promise<FeatureFlags> | null = null;

async function loadFlags(): Promise<FeatureFlags> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = fetch(`${API_BASE}/features`, { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) return {};
      const data = await res.json();
      cached = (data.flags ?? {}) as FeatureFlags;
      return cached;
    })
    .catch(() => ({} as FeatureFlags))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Vite mirrors: VITE_FEATURE_WISHLISTS=true etc. override / force-on for local UI. */
function viteOverrides(): FeatureFlags {
  const env = import.meta.env as Record<string, string | undefined>;
  const map: Record<string, string> = {
    wishlists: "VITE_FEATURE_WISHLISTS",
    wishlistsShare: "VITE_FEATURE_WISHLISTS_SHARE",
    timedDeals: "VITE_FEATURE_TIMED_DEALS",
    deals: "VITE_FEATURE_TIMED_DEALS",
    membership: "VITE_FEATURE_MEMBERSHIP",
    cartUpsell: "VITE_FEATURE_CART_UPSELL",
    returns: "VITE_FEATURE_RETURNS",
    supportChat: "VITE_FEATURE_SUPPORT_CHAT",
    chat: "VITE_FEATURE_SUPPORT_CHAT",
    pushNotifications: "VITE_FEATURE_PUSH",
    push: "VITE_FEATURE_PUSH",
    subscriptions: "VITE_FEATURE_SUBSCRIPTIONS",
    marketplace: "VITE_FEATURE_MARKETPLACE",
    sentry: "VITE_FEATURE_SENTRY",
  };
  const out: FeatureFlags = {};
  for (const [flag, key] of Object.entries(map)) {
    const raw = env[key];
    if (raw == null || raw === "") continue;
    out[flag] = raw === "1" || raw.toLowerCase() === "true";
  }
  return out;
}

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags>(() => ({
    ...(cached ?? {}),
    ...viteOverrides(),
  }));
  const [ready, setReady] = useState(Boolean(cached));

  useEffect(() => {
    let cancelled = false;
    loadFlags().then((server) => {
      if (cancelled) return;
      setFlags({ ...server, ...viteOverrides() });
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const enabled = (key: string) => Boolean(flags[key]);

  return { flags, ready, enabled };
}

export function isFlagOn(flags: FeatureFlags, key: string) {
  return Boolean(flags[key]);
}
