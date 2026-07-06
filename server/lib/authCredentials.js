import { createClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "./env.js";

function sanitizeEnv(value) {
  const trimmed = String(value ?? "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function getAnonKey() {
  return sanitizeEnv(process.env.SUPABASE_ANON_KEY) || sanitizeEnv(process.env.VITE_SUPABASE_ANON_KEY);
}

export function isAnonKeyConfigured() {
  return Boolean(env.supabaseUrl && getAnonKey());
}

function getServiceRoleClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Quick check that the anon key is accepted by Supabase (optional env). */
export async function verifyAnonKey() {
  if (!isAnonKeyConfigured()) {
    return { ok: false, error: "SUPABASE_ANON_KEY is not set" };
  }

  const client = createClient(env.supabaseUrl, getAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await client.auth.getSession();
  if (error?.message?.toLowerCase().includes("api key")) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * Verify email + password on the server using the service role key.
 * Returns Supabase session tokens on success (for OTP login flow).
 */
export async function verifyUserCredentials(email, password) {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Railway."
    );
  }

  const client = getServiceRoleClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error || !data.session) {
    return { ok: false, error: error?.message ?? "Invalid email or password." };
  }

  await client.auth.signOut();

  return {
    ok: true,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: data.user,
  };
}
