import { createClient } from "@supabase/supabase-js";
import { assertSupabaseConfigured, env, isSupabaseConfigured } from "./env.js";

export const supabase = isSupabaseConfigured()
  ? createClient(env.supabaseUrl, env.supabaseServiceRoleKey)
  : null;

export function requireSupabase() {
  assertSupabaseConfigured();
  return supabase;
}
