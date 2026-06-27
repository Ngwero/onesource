import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import { assertSmtpConfigured, env, isSmtpConfigured } from "./env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

let cachedTemplate = null;

async function loadResetPasswordTemplate() {
  if (cachedTemplate) return cachedTemplate;
  const templatePath = path.join(
    __dirname,
    "..",
    "supabase",
    "email-templates",
    "reset-password.html"
  );
  cachedTemplate = await fs.readFile(templatePath, "utf8");
  return cachedTemplate;
}

export function renderResetPasswordEmail({ email, fullName, resetLink }) {
  const greeting = fullName?.trim() ? `Hi ${fullName.trim()},` : "Hi there,";
  const shopUrl = env.shopUrl;

  return loadResetPasswordTemplate().then((template) =>
    template
      .replace(
        /{{ if \.Data\.full_name }}Hi {{ \.Data\.full_name }},{{ else }}Hi there,{{ end }}/g,
        greeting
      )
      .replace(/\{\{ \.ConfirmationURL \}\}/g, resetLink)
      .replace(/\{\{ \.SiteURL \}\}/g, shopUrl)
      .replace(/\{\{ \.Email \}\}/g, email)
  );
}

export async function sendPasswordResetEmail({ email, fullName, resetLink }) {
  const html = await renderResetPasswordEmail({ email, fullName, resetLink });
  const transport = getTransporter();

  await transport.sendMail({
    from: env.smtp.from,
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

function greetingLine(fullName) {
  return fullName?.trim() ? `Hi ${fullName.trim()},` : "Hi there,";
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
