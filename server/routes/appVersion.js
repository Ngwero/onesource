import { Router } from "express";

const IOS_APP_ID = "6812755053";
const IOS_BUNDLE_ID = "com.ngwero.onesourceios";
const ANDROID_PACKAGE = "com.ngwero.onesource";

/**
 * Bump `latest` after a release is live in the stores; raise `minimum` only
 * when older builds must stop working (they get a non-dismissible prompt).
 * Env vars override these without a code change.
 */
const config = {
  ios: {
    latest: process.env.APP_IOS_LATEST || "1.0.4",
    minimum: process.env.APP_IOS_MINIMUM || "1.0.0",
    url: `https://apps.apple.com/app/id${IOS_APP_ID}`,
  },
  android: {
    latest: process.env.APP_ANDROID_LATEST || "1.0.4",
    minimum: process.env.APP_ANDROID_MINIMUM || "1.0.0",
    url: `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`,
  },
};

function compareVersions(a, b) {
  const pa = String(a).split(".").map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

let storeCache = { version: null, at: 0 };
const STORE_TTL_MS = 30 * 60 * 1000;

/** Version Apple is serving right now, so we never prompt for an unreleased build. */
async function liveIosVersion() {
  if (storeCache.version && Date.now() - storeCache.at < STORE_TTL_MS) return storeCache.version;
  try {
    const res = await fetch(`https://itunes.apple.com/lookup?bundleId=${IOS_BUNDLE_ID}`, {
      signal: AbortSignal.timeout(4000),
    });
    const data = await res.json();
    const version = data?.results?.[0]?.version ?? null;
    if (version) storeCache = { version, at: Date.now() };
    return version;
  } catch {
    return storeCache.version;
  }
}

const router = Router();

router.get("/", async (_req, res) => {
  const live = await liveIosVersion();
  const iosLatest =
    live && compareVersions(live, config.ios.latest) < 0 ? live : config.ios.latest;
  res.set("Cache-Control", "public, max-age=300");
  res.json({
    ios: { ...config.ios, latest: iosLatest },
    android: config.android,
  });
});

export default router;
