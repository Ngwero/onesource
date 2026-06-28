import { Router } from "express";
import { verifyUserCredentials } from "../lib/authCredentials.js";
import { env, isSmtpConfigured } from "../lib/env.js";
import {
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from "../lib/mail.js";
import {
  canRequestOtp,
  recordOtpRequest,
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

    const resetLink = data.properties.action_link;

    // Respond immediately — SMTP from cloud hosts can be slow or hang.
    res.json({ ok: true });

    void sendPasswordResetEmail({ email, fullName, resetLink }).catch((err) => {
      console.error("[auth] forgot-password email failed:", err);
    });
    return;
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

    if (!canRequestOtp(email)) {
      return res.status(429).json({
        error: "Too many login attempts. Please wait a few minutes and try again.",
      });
    }

    const verified = await verifyUserCredentials(email, password);
    if (!verified.ok) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    recordOtpRequest(email);

    // OTP email is sent by Supabase on the client (signInWithOtp) — not Railway SMTP.
    return res.json({ ok: true, verified: true });
  } catch (e) {
    console.error("[auth] login/request-otp failed:", e);
    return res.status(500).json({
      error: e instanceof Error ? e.message : "Could not start login",
    });
  }
});

router.get("/status", (_req, res) => {
  res.json({
    smtp: isSmtpConfigured(),
    shopUrl: env.shopUrl,
    otpLogin: true,
    otpProvider: "supabase",
  });
});

export default router;
