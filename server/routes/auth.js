import { Router } from "express";
import { verifyUserCredentials } from "../lib/authCredentials.js";
import { env, isSmtpConfigured } from "../lib/env.js";
import {
  sendLoginOtpEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from "../lib/mail.js";
import {
  canRequestOtp,
  generateOtp,
  recordOtpRequest,
  storeLoginOtp,
  verifyLoginOtp,
} from "../lib/otpStore.js";
import { requireSupabase } from "../lib/supabase.js";

const router = Router();

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function lookupProfileName(supabase, userId) {
  if (!userId) return "";
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  return data?.full_name?.trim() ?? "";
}

function getBearerToken(req) {
  const header = req.headers.authorization?.trim() ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return "";
  return header.slice(7).trim();
}

router.post("/forgot-password", async (req, res) => {
  try {
    if (!isSmtpConfigured()) {
      return res.status(503).json({
        error:
          "Password reset email is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM in server/.env.",
      });
    }

    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();
    const redirectTo =
      String(req.body?.redirectTo ?? `${env.shopUrl}/reset-password`).trim() ||
      `${env.shopUrl}/reset-password`;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "A valid email address is required." });
    }

    const supabase = requireSupabase();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    if (error || !data?.properties?.action_link) {
      return res.json({ ok: true });
    }

    const metaName = data.user?.user_metadata?.full_name;
    const fullName =
      (typeof metaName === "string" ? metaName.trim() : "") ||
      (await lookupProfileName(supabase, data.user?.id)) ||
      "";

    await sendPasswordResetEmail({
      email,
      fullName,
      resetLink: data.properties.action_link,
    });

    return res.json({ ok: true });
  } catch (e) {
    console.error("[auth] forgot-password failed:", e);
    return res.status(500).json({
      error: e instanceof Error ? e.message : "Could not send password reset email",
    });
  }
});

router.post("/welcome", async (req, res) => {
  try {
    if (!isSmtpConfigured()) {
      return res.status(503).json({ error: "Welcome email is not configured (SMTP missing)." });
    }

    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const supabase = requireSupabase();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user?.email) {
      return res.status(401).json({ error: "Invalid session." });
    }

    const email = data.user.email.toLowerCase();
    const metaName = data.user.user_metadata?.full_name;
    const fullName =
      (typeof metaName === "string" ? metaName.trim() : "") ||
      (await lookupProfileName(supabase, data.user.id)) ||
      "";

    await sendWelcomeEmail({ email, fullName });
    return res.json({ ok: true });
  } catch (e) {
    console.error("[auth] welcome failed:", e);
    return res.status(500).json({
      error: e instanceof Error ? e.message : "Could not send welcome email",
    });
  }
});

router.post("/login/request-otp", async (req, res) => {
  try {
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password ?? "");

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "A valid email address is required." });
    }
    if (!password) {
      return res.status(400).json({ error: "Password is required." });
    }

    const verified = await verifyUserCredentials(email, password);
    if (!verified.ok) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (!isSmtpConfigured()) {
      return res.json({
        ok: true,
        otpRequired: false,
        access_token: verified.accessToken,
        refresh_token: verified.refreshToken,
      });
    }

    if (!canRequestOtp(email)) {
      return res.status(429).json({
        error: "Too many login attempts. Please wait a few minutes and try again.",
      });
    }

    recordOtpRequest(email);

    const supabase = requireSupabase();
    const metaName = verified.user?.user_metadata?.full_name;
    const fullName =
      (typeof metaName === "string" ? metaName.trim() : "") ||
      (await lookupProfileName(supabase, verified.user?.id)) ||
      "";

    const otp = generateOtp();
    storeLoginOtp(email, otp, {
      accessToken: verified.accessToken,
      refreshToken: verified.refreshToken,
    });

    await sendLoginOtpEmail({ email, fullName, otp });

    return res.json({ ok: true, otpRequired: true });
  } catch (e) {
    console.error("[auth] login/request-otp failed:", e);
    return res.status(500).json({
      error: e instanceof Error ? e.message : "Could not start login",
    });
  }
});

router.post("/login/verify-otp", async (req, res) => {
  try {
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();
    const otp = String(req.body?.otp ?? "").trim();

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "A valid email address is required." });
    }
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: "Enter the 6-digit code from your email." });
    }

    const result = verifyLoginOtp(email, otp);
    if (!result.ok) {
      const messages = {
        invalid_or_expired: "This code has expired. Please sign in again.",
        invalid_code: "Incorrect code. Please try again.",
        too_many_attempts: "Too many incorrect attempts. Please sign in again.",
      };
      return res.status(401).json({ error: messages[result.error] ?? "Invalid code." });
    }

    return res.json({
      ok: true,
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
    });
  } catch (e) {
    console.error("[auth] login/verify-otp failed:", e);
    return res.status(500).json({
      error: e instanceof Error ? e.message : "Could not verify login code",
    });
  }
});

router.get("/status", (_req, res) => {
  res.json({
    smtp: isSmtpConfigured(),
    shopUrl: env.shopUrl,
    otpLogin: isSmtpConfigured(),
  });
});

export default router;
