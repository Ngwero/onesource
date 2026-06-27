import { Router } from "express";
import { env, isSmtpConfigured } from "../lib/env.js";
import { sendPasswordResetEmail } from "../lib/mail.js";
import { requireSupabase } from "../lib/supabase.js";

const router = Router();

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
      // Do not reveal whether the account exists.
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

async function lookupProfileName(supabase, userId) {
  if (!userId) return "";
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  return data?.full_name?.trim() ?? "";
}

export default router;
