/** Detect password-recovery callback URLs from Supabase auth emails. */
export function isPasswordRecoveryCallback(): boolean {
  if (typeof window === "undefined") return false;

  const path = window.location.pathname;
  if (!path.endsWith("/reset-password")) return false;

  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return (
    search.has("code") ||
    search.get("type") === "recovery" ||
    hash.get("type") === "recovery" ||
    hash.has("access_token")
  );
}
