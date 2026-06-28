import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const portRaw = process.env.PORT?.trim();
const parsedPort = portRaw ? Number(portRaw) : NaN;

const smtpPortRaw = process.env.SMTP_PORT?.trim();
const parsedSmtpPort = smtpPortRaw ? Number(smtpPortRaw) : 587;

function parseBool(value, fallback = false) {
  if (value == null || value === "") return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function resolveShopUrl() {
  const explicit = process.env.SHOP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railwayDomain) return `https://${railwayDomain.replace(/\/$/, "")}`;

  return "http://localhost:5174";
}

export const env = {
  port: Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 3001,
  supabaseUrl: process.env.SUPABASE_URL?.trim() ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "",
  shopUrl: resolveShopUrl(),
  smtp: {
    host: process.env.SMTP_HOST?.trim() ?? "",
    port: Number.isFinite(parsedSmtpPort) && parsedSmtpPort > 0 ? parsedSmtpPort : 587,
    secure: parseBool(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER?.trim() ?? "",
    pass: process.env.SMTP_PASS?.trim() ?? "",
    from: process.env.SMTP_FROM?.trim() ?? "",
  },
};

export function isSupabaseConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}

export function useSupabaseStorage() {
  if (!isSupabaseConfigured()) return false;
  const flag = process.env.USE_SUPABASE_STORAGE?.trim().toLowerCase();
  if (!flag) return true;
  return flag === "1" || flag === "true" || flag === "yes";
}

export function isSmtpConfigured() {
  const { host, user, pass, from } = env.smtp;
  return Boolean(host && user && pass && from);
}

export function getSupabaseConfigErrors() {
  const missing = [];
  if (!env.supabaseUrl) missing.push("SUPABASE_URL");
  if (!env.supabaseServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return missing;
}

export function getSmtpConfigErrors() {
  const missing = [];
  if (!env.smtp.host) missing.push("SMTP_HOST");
  if (!env.smtp.user) missing.push("SMTP_USER");
  if (!env.smtp.pass) missing.push("SMTP_PASS");
  if (!env.smtp.from) missing.push("SMTP_FROM");
  return missing;
}

export function assertSupabaseConfigured() {
  const missing = getSupabaseConfigErrors();
  if (missing.length) {
    throw new Error(
      `Supabase is not configured. Set ${missing.join(" and ")} in server/.env (see server/.env.example).`
    );
  }
}

export function assertSmtpConfigured() {
  const missing = getSmtpConfigErrors();
  if (missing.length) {
    throw new Error(
      `SMTP is not configured. Set ${missing.join(", ")} in server/.env (see server/.env.example).`
    );
  }
}
