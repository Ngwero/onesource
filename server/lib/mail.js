import nodemailer from "nodemailer";
import { assertSmtpConfigured, env, isSmtpConfigured } from "./env.js";
import {
  defaultOtpSecurityNote,
  defaultSecurityNote,
  OTP_VALID_SECONDS,
  renderBrandedEmail,
  renderOtpActionBox,
  renderResetActionBox,
  renderWelcomeActionBox,
} from "./emailTemplate.js";

let transporter = null;

const SMTP_TIMEOUT_MS = Number(process.env.SMTP_TIMEOUT_MS) || 20_000;

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
      connectionTimeout: SMTP_TIMEOUT_MS,
      greetingTimeout: SMTP_TIMEOUT_MS,
      socketTimeout: SMTP_TIMEOUT_MS,
    });
  }
  return transporter;
}

function withTimeout(promise, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`${label} timed out after ${SMTP_TIMEOUT_MS / 1000}s`)),
        SMTP_TIMEOUT_MS
      );
    }),
  ]);
}

async function sendBrandedMail({ to, subject, html, text }) {
  const transport = getTransporter();
  await withTimeout(
    transport.sendMail({
      from: env.smtp.from,
      to,
      subject,
      html,
      text,
    }),
    "SMTP send"
  );
}

function greetingLine(fullName) {
  return fullName?.trim() ? `Hi ${fullName.trim()},` : "Hi there,";
}

export async function sendPasswordResetEmail({ email, fullName, resetLink }) {
  const html = renderBrandedEmail({
    eyebrow: "Account security",
    title: "Reset your password",
    subtitle: "We received a request to change your account password.",
    greeting: fullName,
    bodyParagraphs: [
      `A password reset was requested for <strong style="color:#244a3b;">${email}</strong>. Click the button below to choose a new password.`,
    ],
    actionBox: renderResetActionBox(resetLink),
    securityNote: defaultSecurityNote(),
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
    eyebrow: "Welcome aboard",
    title: "Welcome to One Source",
    subtitle: "Fresh produce delivered across Uganda — your account is ready.",
    greeting: fullName,
    bodyParagraphs: [
      "Thank you for creating your One Source account. You can now track orders, save items, and checkout faster.",
      `Sign in any time at <a href="${shopUrl}/login" style="color:#2e5e4a;">${shopUrl}/login</a>.`,
    ],
    actionBox: renderWelcomeActionBox(shopUrl),
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
    eyebrow: "Secure account access",
    title: "Sign-in verification code",
    subtitle: "Use the code below to complete your login.",
    greeting: fullName,
    bodyParagraphs: [
      "We received a sign-in request for your One Source account. Enter this one-time code on the login screen to continue.",
    ],
    actionBox: renderOtpActionBox(otp),
    securityNote: defaultOtpSecurityNote(),
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
