import crypto from "crypto";
import { OTP_VALID_SECONDS } from "./emailTemplate.js";

/** @type {Map<string, { otpHash: string, accessToken: string, refreshToken: string, expiresAt: number, attempts: number }>} */
const pendingLogins = new Map();

/** @type {Map<string, number[]>} */
const requestLog = new Map();

const MAX_OTP_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

function hashOtp(otp) {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
}

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function pruneExpired() {
  const now = Date.now();
  for (const [email, entry] of pendingLogins) {
    if (entry.expiresAt <= now) pendingLogins.delete(email);
  }
}

export function canRequestOtp(email) {
  const key = normalizeEmail(email);
  const now = Date.now();
  const hits = (requestLog.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  requestLog.set(key, hits);
  return hits.length < RATE_LIMIT_MAX;
}

export function recordOtpRequest(email) {
  const key = normalizeEmail(email);
  const hits = requestLog.get(key) ?? [];
  hits.push(Date.now());
  requestLog.set(key, hits);
}

export function storeLoginOtp(email, otp, { accessToken, refreshToken }) {
  pruneExpired();
  const key = normalizeEmail(email);
  pendingLogins.set(key, {
    otpHash: hashOtp(otp),
    accessToken,
    refreshToken,
    expiresAt: Date.now() + OTP_VALID_SECONDS * 1000,
    attempts: 0,
  });
}

export function verifyLoginOtp(email, otp) {
  pruneExpired();
  const key = normalizeEmail(email);
  const entry = pendingLogins.get(key);
  if (!entry) return { ok: false, error: "invalid_or_expired" };

  if (entry.expiresAt <= Date.now()) {
    pendingLogins.delete(key);
    return { ok: false, error: "invalid_or_expired" };
  }

  entry.attempts += 1;
  if (entry.attempts > MAX_OTP_ATTEMPTS) {
    pendingLogins.delete(key);
    return { ok: false, error: "too_many_attempts" };
  }

  if (hashOtp(otp) !== entry.otpHash) {
    return { ok: false, error: "invalid_code" };
  }

  pendingLogins.delete(key);
  return {
    ok: true,
    accessToken: entry.accessToken,
    refreshToken: entry.refreshToken,
  };
}

export function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}
