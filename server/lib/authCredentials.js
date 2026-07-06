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
 * Check email + password (discards the temporary session).
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

  // Discard server-side session — fresh tokens are minted after OTP verification.
  await client.auth.signOut();

  return {
    ok: true,
    user: data.user,
  };
}

/**
 * Create a user session after OTP verification. Do not call signOut — tokens are
 * returned to the client via setSession.
 */
export async function createUserSession(email, password) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const client = getServiceRoleClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error || !data.session) {
    return { ok: false, error: error?.message ?? "Could not create session." };
  }

  return {
    ok: true,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: data.user,
  };
}
