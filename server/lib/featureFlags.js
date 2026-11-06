/**
 * Feature flags for staged rollout.
 * Sources: defaults → FEATURE_FLAGS_JSON → FEATURE_* env → optional FEATURE_FLAGS_URL.
 * Region: FEATURE_FLAGS_BY_REGION JSON / ?region= on GET /api/features.
 *
 * Canonical keys (storefront). Aliases accepted by isFeatureEnabled():
 *   timedDeals ← deals
 *   supportChat ← chat
 *   pushNotifications ← push
 */

function parseBool(value, fallback = false) {
  if (value == null || value === "") return fallback;
  const n = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(n)) return true;
  if (["0", "false", "no", "off"].includes(n)) return false;
  return fallback;
}

function parseJsonObject(raw) {
  if (!raw || !String(raw).trim()) return null;
  try {
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Canonical flag keys exposed to storefront. */
export const FEATURE_FLAG_KEYS = [
  "wishlists",
  "wishlistsShare",
  "timedDeals",
  "membership",
  "cartUpsell",
  "returns",
  "supportChat",
  "pushNotifications",
  "subscriptions",
  "marketplace",
  "sentry",
];

/** Alias → canonical */
const ALIASES = {
  deals: "timedDeals",
  chat: "supportChat",
  push: "pushNotifications",
  timed_deals: "timedDeals",
  support_chat: "supportChat",
  push_notifications: "pushNotifications",
};

const ENV_KEY_MAP = {
  wishlists: "FEATURE_WISHLISTS",
  wishlistsShare: "FEATURE_WISHLISTS_SHARE",
  timedDeals: "FEATURE_TIMED_DEALS",
  membership: "FEATURE_MEMBERSHIP",
  cartUpsell: "FEATURE_CART_UPSELL",
  returns: "FEATURE_RETURNS",
  supportChat: "FEATURE_SUPPORT_CHAT",
  pushNotifications: "FEATURE_PUSH",
  subscriptions: "FEATURE_SUBSCRIPTIONS",
  marketplace: "FEATURE_MARKETPLACE",
  sentry: "FEATURE_SENTRY",
};

/** Also honour legacy env names used by earlier drafts. */
const LEGACY_ENV = {
  timedDeals: ["FEATURE_DEALS"],
  supportChat: ["FEATURE_CHAT"],
};

function defaultFor(_key, env = process.env) {
  // Dev defaults on so local UI can be exercised; production opts in via env.
  if (env.NODE_ENV === "production") return false;
  return true;
}

function canonicalize(key) {
  return ALIASES[key] || key;
}

let remoteOverrides = null;
let remoteFetchedAt = 0;
const REMOTE_TTL_MS = 60_000;

async function refreshRemoteFlags(env = process.env) {
  const url = env.FEATURE_FLAGS_URL?.trim();
  if (!url) return;
  if (Date.now() - remoteFetchedAt < REMOTE_TTL_MS && remoteOverrides) return;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return;
    const json = await res.json();
    remoteOverrides = json && typeof json === "object" ? json : null;
    remoteFetchedAt = Date.now();
  } catch {
    /* keep last known / env */
  }
}

function applyOverrides(base, overrides) {
  if (!overrides) return { ...base };
  const next = { ...base };
  for (const [rawKey, value] of Object.entries(overrides)) {
    const key = canonicalize(rawKey);
    if (FEATURE_FLAG_KEYS.includes(key)) {
      next[key] = Boolean(value);
    }
  }
  return next;
}

/**
 * @param {{ region?: string, env?: NodeJS.ProcessEnv }} [options]
 * @returns {Record<string, boolean>}
 */
export function getFeatureFlagsSync(options = {}) {
  const env = options.env ?? process.env;
  let flags = Object.fromEntries(
    FEATURE_FLAG_KEYS.map((k) => [k, defaultFor(k, env)])
  );

  flags = applyOverrides(flags, parseJsonObject(env.FEATURE_FLAGS_JSON));
  flags = applyOverrides(flags, remoteOverrides);

  for (const [flag, envKey] of Object.entries(ENV_KEY_MAP)) {
    if (env[envKey] != null && String(env[envKey]).trim() !== "") {
      flags[flag] = parseBool(env[envKey], flags[flag]);
    }
  }
  for (const [flag, keys] of Object.entries(LEGACY_ENV)) {
    for (const envKey of keys) {
      if (env[envKey] != null && String(env[envKey]).trim() !== "") {
        flags[flag] = parseBool(env[envKey], flags[flag]);
      }
    }
  }

  const region = String(options.region || env.FEATURE_REGION || "")
    .trim()
    .toUpperCase();
  if (region) {
    const byRegion = parseJsonObject(env.FEATURE_FLAGS_BY_REGION);
    if (byRegion?.[region]) {
      flags = applyOverrides(flags, byRegion[region]);
    }
  }

  return flags;
}

export async function getFeatureFlags(options = {}) {
  await refreshRemoteFlags(options.env ?? process.env);
  return getFeatureFlagsSync(options);
}

export function isFeatureEnabled(key, envOrOptions) {
  const options =
    envOrOptions && typeof envOrOptions === "object" && !envOrOptions.NODE_ENV
      ? envOrOptions
      : { env: envOrOptions };
  // Allow passing process.env as second arg (legacy).
  if (envOrOptions && typeof envOrOptions === "object" && envOrOptions.NODE_ENV !== undefined) {
    options.env = envOrOptions;
  }
  const canonical = canonicalize(key);
  const flags = getFeatureFlagsSync(options);
  return Boolean(flags[canonical]);
}

/** Public payload for GET /api/features (and /api/flags). */
export function featuresPublicPayload(options = {}) {
  const flags = getFeatureFlagsSync(options);
  // Include legacy alias keys so older clients keep working.
  const withAliases = {
    ...flags,
    deals: flags.timedDeals,
    chat: flags.supportChat,
    push: flags.pushNotifications,
  };
  return {
    flags: withAliases,
    region:
      String(options.region || process.env.FEATURE_REGION || "")
        .trim()
        .toUpperCase() || null,
    serverNow: new Date().toISOString(),
  };
}

export { FEATURE_FLAG_KEYS as FLAG_KEYS, ENV_KEY_MAP as ENV_MAP, parseBool, ALIASES };
