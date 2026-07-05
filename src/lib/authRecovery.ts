import type { SupabaseClient } from "@supabase/supabase-js";

function hashParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.hash.replace(/^#/, ""));
}

function searchParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

/** Detect password-recovery callback URLs from Supabase auth emails. */
export function isPasswordRecoveryCallback(): boolean {
  if (typeof window === "undefined") return false;

  const path = window.location.pathname;
  if (!path.endsWith("/reset-password")) return false;

  const search = searchParams();
  const hash = hashParams();

  return (
    search.has("code") ||
    search.get("type") === "recovery" ||
    hash.get("type") === "recovery" ||
    hash.has("access_token")
  );
}

/** Parse recovery tokens from Supabase redirect (hash implicit or PKCE code). */
export function parseRecoveryTokensFromUrl():
  | { accessToken: string; refreshToken: string }
  | { code: string }
  | null {
  const hash = hashParams();
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  if (accessToken && refreshToken) {
    return { accessToken, refreshToken };
  }

  const code = searchParams().get("code");
  if (code) return { code };

  return null;
}

/** Exchange reset-link tokens for a Supabase session (required before updateUser). */
export async function establishPasswordRecoverySession(
  supabase: SupabaseClient
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: existing } = await supabase.auth.getSession();
  if (existing.session) return { ok: true };

  const tokens = parseRecoveryTokensFromUrl();
  if (!tokens) {
    return { ok: false, error: "missing_tokens" };
  }

  if ("code" in tokens) {
    const { error } = await supabase.auth.exchangeCodeForSession(tokens.code);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const { error } = await supabase.auth.setSession({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
