import { createClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "./env.js";

function getAnonKey() {
  return (
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
    ""
  );
}

export function isAnonKeyConfigured() {
  return Boolean(env.supabaseUrl && getAnonKey());
}

/**
 * Verify email + password without persisting a client session.
 * Returns Supabase session tokens on success.
 */
export async function verifyUserCredentials(email, password) {
  if (!isSupabaseConfigured() || !isAnonKeyConfigured()) {
    throw new Error(
      "SUPABASE_ANON_KEY is required on the server for login OTP. Add it to Railway variables."
    );
  }

  const anon = createClient(env.supabaseUrl, getAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await anon.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error || !data.session) {
    return { ok: false, error: error?.message ?? "Invalid email or password." };
  }

  await anon.auth.signOut();

  return {
    ok: true,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: data.user,
  };
}
