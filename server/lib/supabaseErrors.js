import { env } from "./env.js";

export function isSupabaseConnectionError(error) {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("fetch failed") ||
    msg.includes("enotfound") ||
    msg.includes("nxdomain") ||
    msg.includes("econnrefused") ||
    msg.includes("network") ||
    msg.includes("getaddrinfo")
  );
}

export function isStatementTimeoutError(error) {
  return (
    error?.code === "57014" ||
    /statement timeout|canceling statement/i.test(String(error?.message ?? ""))
  );
}

/** Message safe to show users; Postgres timeouts get a plain-language explanation. */
export function dbErrorMessage(error) {
  if (isStatementTimeoutError(error)) {
    return "The database took too long to answer — try again, or narrow your search/filters.";
  }
  return error?.message || String(error);
}

export function supabaseConnectionHint() {
  let host = "your-project";
  try {
    if (env.supabaseUrl) host = new URL(env.supabaseUrl).host;
  } catch {
    /* ignore */
  }
  return `Cannot reach Supabase at ${host}. The project may have been deleted or the URL in server/.env is wrong. Create a project at supabase.com, update server/.env and .env, run schema.sql, then npm run seed.`;
}
