import { Router } from "express";
import { verifyUserCredentials } from "../lib/authCredentials.js";
import { env, isSmtpConfigured } from "../lib/env.js";
import {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendLoginOtpEmail,
  verifySmtpConnection,
} from "../lib/mail.js";
import {
  canRequestOtp,
  recordOtpRequest,
  generateOtp,
  storeLoginOtp,
  verifyLoginOtp as checkStoredOtp,
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

function isEmailRateLimitError(error) {
  if (!error) return false;
  const code = String(error.code ?? "").toLowerCase();
  const message = String(error.message ?? "").toLowerCase();
  return (
    code === "over_email_send_rate_limit" ||
    message.includes("rate limit") ||
    message.includes("too many requests")
  );
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

    if (error) {
      if (isEmailRateLimitError(error)) {
        return res.status(429).json({
          error:
            "Too many password reset emails. Wait about an hour, or in Supabase go to Authentication → SMTP (set up custom SMTP) and Authentication → Rate Limits to raise the email cap.",
        });
      }
      if (error.code === "user_not_found" || error.status === 404) {
        return res.status(404).json({
          error:
            "No account is registered with this email. Check for typos or sign up for a new account.",
        });
      }
      console.warn("[auth] forgot-password generateLink:", error.code ?? error.message);
      return res.status(400).json({
        error: "Could not start password reset. Try again in a few minutes.",
      });
    }

    if (!data?.properties?.action_link) {
      console.warn("[auth] forgot-password generateLink: missing action_link");
      return res.status(400).json({
        error: "Could not create a password reset link. Try again in a few minutes.",
      });
    }

    const metaName = data.user?.user_metadata?.full_name;
    const fullName =
      (typeof metaName === "string" ? metaName.trim() : "") ||
      (await lookupProfileName(supabase, data.user?.id)) ||
      "";

    const resetLink = data.properties.action_link;

    try {
      await sendPasswordResetEmail({ email, fullName, resetLink });
      console.info(`[auth] forgot-password sent to ${email}`);
      return res.json({ ok: true, sent: true });
    } catch (err) {
      console.error("[auth] forgot-password email failed:", err);
      return res.status(503).json({
        error:
          "We could not send the reset email right now. The mail server may be unreachable from production — use Brevo or SendGrid for SMTP on Railway, or try again shortly.",
      });
    }
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

    if (!isSmtpConfigured()) {
      return res.status(503).json({
        error:
          "Login email is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM in server/.env.",
      });
    }

    recordOtpRequest(email);

    const otp = generateOtp();
    const metaName = verified.user?.user_metadata?.full_name;
    const fullName =
      (typeof metaName === "string" ? metaName.trim() : "") ||
      (await lookupProfileName(requireSupabase(), verified.user?.id)) ||
      "";

    storeLoginOtp(email, otp, {
      accessToken: verified.accessToken,
      refreshToken: verified.refreshToken,
    });

    await sendLoginOtpEmail({ email, fullName, otp });

    return res.json({ ok: true, verified: true });
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

    const result = checkStoredOtp(email, otp);
    if (!result.ok) {
      const messages = {
        invalid_or_expired: "Code expired or not found. Sign in again to get a new code.",
        invalid_code: "Incorrect code. Check your email and try again.",
        too_many_attempts: "Too many wrong attempts. Sign in again to get a new code.",
      };
      return res.status(401).json({
        error: messages[result.error] ?? "Could not verify code.",
      });
    }

    return res.json({
      ok: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (e) {
    console.error("[auth] login/verify-otp failed:", e);
    return res.status(500).json({
      error: e instanceof Error ? e.message : "Could not verify login code",
    });
  }
});

router.get("/status", async (req, res) => {
  const payload = {
    smtp: isSmtpConfigured(),
    shopUrl: env.shopUrl,
    otpLogin: true,
    otpProvider: "onesource-smtp",
  };

  if (req.query.verify === "1" && isSmtpConfigured()) {
    const check = await verifySmtpConnection();
    payload.smtpVerified = check.ok;
    if (!check.ok) payload.smtpError = check.error;
  }

  res.json(payload);
});

export default router;
