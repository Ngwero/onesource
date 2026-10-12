import { Router } from "express";

const router = Router();

const COUNTRY_HEADERS = [
  "cf-ipcountry",
  "x-vercel-ip-country",
  "cloudfront-viewer-country",
  "x-country-code",
  "fly-client-ip-country",
];
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 5000;
const cache = new Map();

function clientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return (forwarded || req.socket.remoteAddress || "").replace(/^::ffff:/, "");
}

function isPublicIp(ip) {
  if (!ip) return false;
  if (ip.includes(":")) return !/^(::1$|fc|fd|fe80)/i.test(ip);
  const [a, b] = ip.split(".").map(Number);
  if ([a, b].some(Number.isNaN)) return false;
  return !(
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

async function lookupCountry(ip) {
  const hit = cache.get(ip);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.country;
  const res = await fetch(`https://api.country.is/${encodeURIComponent(ip)}`, {
    signal: AbortSignal.timeout(2500),
  });
  const country = res.ok ? String((await res.json()).country || "").toUpperCase() : "";
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(ip, { country, at: Date.now() });
  return country;
}

router.get("/", async (req, res) => {
  res.set("Cache-Control", "private, max-age=3600");
  for (const header of COUNTRY_HEADERS) {
    const value = String(req.headers[header] || "").toUpperCase();
    if (/^[A-Z]{2}$/.test(value) && value !== "XX") return res.json({ country: value, source: "edge" });
  }
  const ip = clientIp(req);
  if (!isPublicIp(ip)) return res.json({ country: null, source: "local" });
  try {
    const country = await lookupCountry(ip);
    res.json({ country: /^[A-Z]{2}$/.test(country) ? country : null, source: "ip" });
  } catch {
    res.json({ country: null, source: "unavailable" });
  }
});

export default router;
