/**
 * Optional Sentry — no-op without VITE_SENTRY_DSN.
 * Install `@sentry/react` when enabling in production (FEATURE_SENTRY / VITE_SENTRY_DSN).
 */

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

type SentryMod = {
  init: (opts: { dsn: string; environment?: string; tracesSampleRate?: number }) => void;
};

export async function initSentry() {
  if (!dsn) return;
  try {
    const specifier = "@sentry/" + "react";
    const mod = (await import(/* @vite-ignore */ specifier)) as SentryMod;
    mod.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
    });
  } catch {
    console.warn(
      "[sentry] DSN set but @sentry/react is not installed — run: npm i @sentry/react"
    );
  }
}
