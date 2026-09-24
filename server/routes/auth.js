import { Router } from "express";
import { verifyUserCredentials, isAnonKeyConfigured, verifyAnonKey, createUserSession } from "../lib/authCredentials.js";
import { env, getMailTransportLabel, isMailConfigured, isSmtpConfigured } from "../lib/env.js";
import {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendLoginOtpEmail,
  verifySmtpConnection,
} from "../lib/mail.js";
import {
  canRequestOtp,
  recordOtpRequest,
  resolveLoginOtp,
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
    if (!isMailConfigured()) {
      return res.status(503).json({
        error:
          "Password reset email is not configured. Set BREVO_API_KEY (recommended on Railway) or SMTP_* in server/.env.",
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
          "We could not send the reset email right now. Email delivery is misconfigured (SMTP password rejected). Set BREVO_API_KEY on Railway, or upload server/cpanel/send-app-mail.php and set CPANEL_MAIL_URL + CPANEL_MAIL_SECRET.",
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
    if (!isMailConfigured()) {
      return res.status(503).json({ error: "Welcome email is not configured (BREVO_API_KEY or SMTP missing)." });
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

/**
 * Create account via Admin API (email already confirmed) and send welcome
 * through the same Brevo/SMTP path as login OTP — avoids Supabase Auth SMTP.
 */
router.post("/signup", async (req, res) => {
  try {
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password ?? "");
    const fullName = String(req.body?.fullName ?? req.body?.full_name ?? "").trim();

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "A valid email address is required." });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const supabase = requireSupabase();
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: fullName ? { full_name: fullName } : undefined,
    });

    if (createError) {
      const msg = String(createError.message ?? "").toLowerCase();
      if (
        msg.includes("already") ||
        msg.includes("registered") ||
        msg.includes("exists") ||
        createError.code === "email_exists" ||
        createError.status === 422
      ) {
        return res.status(409).json({
          error: "An account with this email already exists. Try logging in instead.",
        });
      }
      console.warn("[auth] signup createUser:", createError.code ?? createError.message);
      return res.status(400).json({
        error: createError.message || "Could not create account. Please try again.",
      });
    }

    const userId = created.user?.id;
    if (userId) {
      try {
        await supabase.from("profiles").upsert({
          id: userId,
          full_name: fullName || null,
          updated_at: new Date().toISOString(),
        });
      } catch (profileErr) {
        console.warn("[auth] signup profile upsert:", profileErr);
      }
    }

    if (isMailConfigured()) {
      try {
        await sendWelcomeEmail({ email, fullName });
        console.info(`[auth] signup welcome sent to ${email}`);
      } catch (mailErr) {
        // Account is created — don't fail signup if welcome mail fails.
        console.error("[auth] signup welcome email failed:", mailErr);
      }
    } else {
      console.warn(`[auth] signup welcome skipped (mail not configured) for ${email}`);
    }

    const session = await createUserSession(email, password);
    if (!session.ok) {
      console.error("[auth] signup session failed:", session.error);
      return res.status(201).json({
        ok: true,
        needsSignIn: true,
        message: "Account created. Please log in.",
      });
    }

    return res.status(201).json({
      ok: true,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
  } catch (e) {
    console.error("[auth] signup failed:", e);
    return res.status(500).json({
      error: e instanceof Error ? e.message : "Could not create account",
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

    if (!isMailConfigured()) {
      // Mail broken / missing — still allow password sign-in so users are not locked out.
      const session = await createUserSession(email, password);
      if (!session.ok) {
        console.error("[auth] login fallback session failed:", session.error);
        return res.status(500).json({
          error: "Could not complete sign-in. Please try again.",
        });
      }
      console.warn(`[auth] login OTP skipped (mail not configured) for ${email}`);
      return res.json({
        ok: true,
        verified: true,
        otpRequired: false,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      });
    }

    recordOtpRequest(email);

    const otp = resolveLoginOtp(email);
    const metaName = verified.user?.user_metadata?.full_name;
    const fullName =
      (typeof metaName === "string" ? metaName.trim() : "") ||
      (await lookupProfileName(requireSupabase(), verified.user?.id)) ||
      "";

    try {
      await sendLoginOtpEmail({ email, fullName, otp });
    } catch (err) {
      console.error("[auth] login OTP email failed:", err);
      // SMTP/Brevo outage — complete sign-in with password only.
      const session = await createUserSession(email, password);
      if (!session.ok) {
        return res.status(503).json({
          error:
            "We could not send your login code and could not complete sign-in. Check mail settings (BREVO_API_KEY or SMTP_PASS), then try again.",
        });
      }
      console.warn(`[auth] login OTP bypassed after mail failure for ${email}`);
      return res.json({
        ok: true,
        verified: true,
        otpRequired: false,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      });
    }

    storeLoginOtp(email, otp, { password });

    return res.json({ ok: true, verified: true, otpRequired: true });
  } catch (e) {
    console.error("[auth] login/request-otp failed:", e);
    const raw = e instanceof Error ? e.message : "Could not start login";
    const friendly =
      /535|authentication data|Invalid login|ECONNREFUSED|ETIMEDOUT|mail/i.test(raw)
        ? "We could not send your login email right now. Please try again shortly."
        : raw;
    return res.status(500).json({ error: friendly });
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

    const session = await createUserSession(email, result.password);
    if (!session.ok) {
      console.error("[auth] login/verify-otp session failed:", session.error);
      return res.status(500).json({
        error: "Could not complete sign-in. Please try again.",
      });
    }

    return res.json({
      ok: true,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
  } catch (e) {
    console.error("[auth] login/verify-otp failed:", e);
    return res.status(500).json({
      error: e instanceof Error ? e.message : "Could not verify login code",
    });
  }
});

/**
 * Permanently delete the signed-in user's account (App Store 5.1.1(v)).
 * Anonymizes order PII, then removes auth.users (profiles cascade).
 */
router.delete("/account", async (req, res) => {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const supabase = requireSupabase();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user?.id) {
      return res.status(401).json({ error: "Invalid session." });
    }

    const userId = data.user.id;
    const deletedLabel = `deleted-user-${userId.slice(0, 8)}`;

    const { error: anonError } = await supabase
      .from("orders")
      .update({
        email: `${deletedLabel}@deleted.local`,
        full_name: "Deleted user",
        phone: null,
        address_line1: "Removed",
        address_line2: null,
        city: "Removed",
        notes: null,
      })
      .eq("user_id", userId);

    if (anonError) {
      console.error("[auth] delete account anonymize orders:", anonError.message);
      return res.status(500).json({
        error: "Could not remove personal data from orders. Please try again.",
      });
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("[auth] deleteUser:", deleteError.message);
      return res.status(500).json({
        error: "Could not delete your account. Please try again.",
      });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error("[auth] delete account failed:", e);
    return res.status(500).json({
      error: e instanceof Error ? e.message : "Could not delete account",
    });
  }
});

router.get("/status", async (req, res) => {
  let supabaseHost = "";
  try {
    supabaseHost = new URL(env.supabaseUrl).hostname;
  } catch {
    supabaseHost = "";
  }

  const payload = {
    mail: isMailConfigured(),
    mailTransport: getMailTransportLabel(),
    smtp: isSmtpConfigured(),
    shopUrl: env.shopUrl,
    otpLogin: true,
    otpProvider: env.brevoApiKey
      ? "brevo"
      : env.resendApiKey
        ? "resend"
        : env.cpanelMailUrl && env.cpanelMailSecret
          ? "cpanel"
          : "smtp",
    anonKeyConfigured: isAnonKeyConfigured(),
    supabaseHost,
  };

  if (req.query.verify === "1" && isSmtpConfigured()) {
    const check = await verifySmtpConnection();
    payload.smtpVerified = check.ok;
    if (!check.ok) payload.smtpError = check.error;
  }

  if (req.query.verify === "1" && isAnonKeyConfigured()) {
    const anonCheck = await verifyAnonKey();
    payload.anonKeyValid = anonCheck.ok;
    if (!anonCheck.ok) payload.anonKeyError = anonCheck.error;
  }

  res.json(payload);
});

export default router;
