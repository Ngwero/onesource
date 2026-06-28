import nodemailer from "nodemailer";
import { assertSmtpConfigured, env, isSmtpConfigured } from "./env.js";
import {
  defaultOtpFootnotes,
  defaultSecurityFootnotes,
  OTP_VALID_SECONDS,
  renderBrandedEmail,
  renderOtpActionBox,
  renderResetActionBox,
  renderWelcomeActionBox,
} from "./emailTemplate.js";

let transporter = null;

function getTransporter() {
  assertSmtpConfigured();
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass,
      },
    });
  }
  return transporter;
}

function greetingLine(fullName) {
  return fullName?.trim() ? `Hi ${fullName.trim()},` : "Hi there,";
}

async function sendBrandedMail({ to, subject, html, text }) {
  const transport = getTransporter();
  await transport.sendMail({
    from: env.smtp.from,
    to,
    subject,
    html,
    text,
  });
}

export async function sendPasswordResetEmail({ email, fullName, resetLink }) {
  const html = renderBrandedEmail({
    headerLabel: "Account",
    heroTag: "Password reset",
    heroTitle: "Reset your One Source password",
    heroSubtitle: "We received a request to reset the password for your account.",
    greeting: fullName,
    bodyParagraphs: [
      `Please use the link below to choose a new password for <strong style="color:#2e5e4a;">${email}</strong>.`,
      "If you did not request a password reset, you can safely ignore this email.",
    ],
    actionBox: renderResetActionBox(resetLink),
    footnotes: defaultSecurityFootnotes(),
  });

  await sendBrandedMail({
    to: email,
    subject: "Reset your One Source password",
    html,
    text: [
      greetingLine(fullName),
      "",
      `Use this link to reset your password for ${email}:`,
      resetLink,
      "",
      "If you did not request this, you can ignore this email.",
      "",
      "One Source Account Team",
    ].join("\n"),
  });
}

export async function sendWelcomeEmail({ email, fullName }) {
  const shopUrl = env.shopUrl;
  const html = renderBrandedEmail({
    headerLabel: "Welcome",
    heroTag: "Welcome",
    heroTitle: "Welcome to One Source",
    heroSubtitle: "Fresh produce delivered across Uganda — your account is ready.",
    greeting: fullName,
    bodyParagraphs: [
      "Thank you for creating your One Source account. You can now track orders, save items, and checkout faster.",
      `Sign in any time at <a href="${shopUrl}/login" style="color:#2e5e4a;">${shopUrl}/login</a>.`,
    ],
    actionBox: renderWelcomeActionBox(shopUrl),
    footnotes: [
      "Please keep your password secure and do not share it with anyone.",
      `Bookmark <a href="${shopUrl}" style="color:#2e5e4a;">${shopUrl}</a> for quick access.`,
      "This is an auto-generated message. Please do not reply to this email.",
    ],
  });

  await sendBrandedMail({
    to: email,
    subject: "Welcome to One Source",
    html,
    text: [
      greetingLine(fullName),
      "",
      "Thank you for creating your One Source account.",
      `Start shopping: ${shopUrl}`,
      "",
      "One Source Account Team",
    ].join("\n"),
  });
}

export async function sendLoginOtpEmail({ email, fullName, otp }) {
  const html = renderBrandedEmail({
    headerLabel: "Login",
    heroTag: "Secure login",
    heroTitle: "OTP to sign in",
    heroSubtitle: "Use this one-time code to complete your login on the One Source shop.",
    greeting: fullName,
    bodyParagraphs: [
      "Please find the OTP below for one-time login on the One Source shop portal.",
    ],
    actionBox: renderOtpActionBox(otp),
    footnotes: defaultOtpFootnotes(),
  });

  await sendBrandedMail({
    to: email,
    subject: "Your One Source login code",
    html,
    text: [
      greetingLine(fullName),
      "",
      `Your One Source login OTP is: ${otp}`,
      `This code is valid for ${OTP_VALID_SECONDS} seconds.`,
      "",
      "Do not share this code with anyone.",
      "",
      "One Source Account Team",
    ].join("\n"),
  });
}

export async function verifySmtpConnection() {
  if (!isSmtpConfigured()) {
    return { ok: false, error: "SMTP is not configured" };
  }

  try {
    const transport = getTransporter();
    await transport.verify();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "SMTP verification failed" };
  }
}

export { isSmtpConfigured };
