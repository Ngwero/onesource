import nodemailer from "nodemailer";
import {
  assertMailConfigured,
  assertSmtpConfigured,
  env,
  isMailConfigured,
  isSmtpConfigured,
} from "./env.js";
import { EMAIL_IMAGE_CIDS, getEmailInlineAttachments } from "./emailAssets.js";
import {
  defaultOtpFootnotes,
  defaultResetFootnotes,
  OTP_VALID_SECONDS,
  renderBrandedEmail,
  renderOtpActionBox,
  renderOrderStatusActionBox,
  renderResetActionBox,
  renderWelcomeActionBox,
} from "./emailTemplate.js";

let transporter = null;

const SMTP_TIMEOUT_MS = Number(process.env.SMTP_TIMEOUT_MS) || 45_000;
const HTTP_TIMEOUT_MS = Number(process.env.MAIL_HTTP_TIMEOUT_MS) || 30_000;

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

function withTimeout(promise, label, ms = SMTP_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms / 1000}s`)),
        ms
      );
    }),
  ]);
}

function parseFromAddress(from) {
  const raw = String(from || "").trim();
  const match = raw.match(/^(.*)<([^>]+)>$/);
  if (match) {
    return {
      name: match[1].trim().replace(/^["']|["']$/g, "") || "One Source",
      email: match[2].trim(),
    };
  }
  if (raw.includes("@")) {
    return { name: "One Source", email: raw };
  }
  return { name: "One Source", email: "noreply@one-sourcebrand.com" };
}

/** Replace cid: images with absolute shop URLs (HTTPS APIs don't use nodemailer CIDs). */
function htmlForHttpApi(html) {
  const base = env.shopUrl.replace(/\/$/, "");
  return html
    .replaceAll(`cid:${EMAIL_IMAGE_CIDS.logo}`, `${base}/brand/logo-on-dark-stacked.png`)
    .replaceAll(`cid:${EMAIL_IMAGE_CIDS.hero}`, `${base}/brand/email-hero.jpg`);
}

async function sendViaBrevo({ to, subject, html, text }) {
  const from = parseFromAddress(env.smtp.from || "One Source <noreply@one-sourcebrand.com>");
  const res = await withTimeout(
    fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": env.brevoApiKey,
      },
      body: JSON.stringify({
        sender: { name: from.name, email: from.email },
        to: [{ email: to }],
        replyTo: { email: from.email, name: from.name },
        subject,
        htmlContent: htmlForHttpApi(html),
        textContent: text,
      }),
    }),
    "Brevo API send",
    HTTP_TIMEOUT_MS
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo API ${res.status}: ${body.slice(0, 300) || res.statusText}`);
  }
  return res.json().catch(() => ({ ok: true }));
}

async function sendViaResend({ to, subject, html, text }) {
  const from = env.smtp.from || "One Source <noreply@one-sourcebrand.com>";
  const res = await withTimeout(
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html: htmlForHttpApi(html),
        text,
      }),
    }),
    "Resend API send",
    HTTP_TIMEOUT_MS
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend API ${res.status}: ${body.slice(0, 300) || res.statusText}`);
  }
  return res.json().catch(() => ({ ok: true }));
}

async function sendViaSmtp({ to, subject, html, text }) {
  const transport = getTransporter();
  return withTimeout(
    transport.sendMail({
      from: env.smtp.from,
      to,
      replyTo: env.smtp.user || env.smtp.from,
      subject,
      html,
      text,
      attachments: getEmailInlineAttachments(),
      headers: {
        "X-Entity-Ref-ID": `onesource-${Date.now()}`,
      },
    }),
    "SMTP send"
  );
}

async function sendBrandedMail({ to, subject, html, text }) {
  assertMailConfigured();

  // Prefer HTTPS APIs — Railway Hobby/Trial block outbound SMTP ports.
  if (env.brevoApiKey) {
    const info = await sendViaBrevo({ to, subject, html, text });
    console.info(`[mail] sent via Brevo to ${to}`);
    return info;
  }
  if (env.resendApiKey) {
    const info = await sendViaResend({ to, subject, html, text });
    console.info(`[mail] sent via Resend to ${to}`);
    return info;
  }

  const info = await sendViaSmtp({ to, subject, html, text });
  console.info(`[mail] sent via SMTP to ${to}`);
  return info;
}

function greetingLine(fullName) {
  const name = fullName?.trim();
  return name ? `HI ${name.toUpperCase()},` : "HI THERE,";
}

export async function sendPasswordResetEmail({ email, fullName, resetLink }) {
  const html = renderBrandedEmail({
    headerLabel: "One Source Account",
    heroEyebrow: "Account security",
    heroTitle: "Reset your password",
    heroSubtitle: "Keep your One Source account secure with a new password.",
    greeting: fullName,
    bodyParagraphs: [
      `A password reset was requested for your One Source account linked to <strong style="color:#244a3b;">${email}</strong>.`,
    ],
    actionBox: renderResetActionBox(resetLink, email),
    footnotes: defaultResetFootnotes(),
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
  console.info(`[mail] password reset queued for ${email}`);
}

export async function sendWelcomeEmail({ email, fullName }) {
  const shopUrl = env.shopUrl;
  const html = renderBrandedEmail({
    headerLabel: "One Source Shop",
    heroEyebrow: "Welcome aboard",
    heroTitle: "Welcome to One Source",
    heroSubtitle: "Fresh produce delivered across Uganda — your account is ready.",
    greeting: fullName,
    bodyParagraphs: [
      "Thank you for creating your One Source account. You can now track orders, save items, and checkout faster.",
      `Sign in any time at <a href="${shopUrl}/login" style="color:#2e5e4a;font-weight:600;">${shopUrl}/login</a>.`,
    ],
    actionBox: renderWelcomeActionBox(shopUrl),
    footnotes: [
      "Browse the shop to discover fresh produce delivered across Uganda.",
      "If you did not create this account, please contact our support team.",
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

function formatUgx(amount) {
  return `USh ${Number(amount).toLocaleString("en-UG", { maximumFractionDigits: 0 })}`;
}

function shortOrderRef(id) {
  return String(id || "").replace(/-/g, "").slice(0, 8).toUpperCase();
}

function orderItemsSummary(items = []) {
  if (!items.length) return "Your order items";
  const head = items.slice(0, 3).map((i) => `${i.product_title} × ${i.quantity}`);
  const tail = items.length > 3 ? ` and ${items.length - 3} more` : "";
  return head.join(", ") + tail;
}

function orderDeliveryAddress(order) {
  const parts = [
    order.address_line1,
    order.address_line2,
    order.city,
    order.district,
  ].filter(Boolean);
  return parts.join(", ");
}

function orderTrackUrl(orderId) {
  return `${env.shopUrl}/orders/${orderId}`;
}

async function sendOrderStatusEmail(order, { heroTitle, heroSubtitle, bodyParagraphs, statusLabel, subject }) {
  if (!isMailConfigured()) {
    console.warn("[mail] mail not configured — skipping order email");
    return { sent: false, reason: "smtp_not_configured" };
  }

  const items = order.order_items ?? [];
  const html = renderBrandedEmail({
    headerLabel: "One Source Orders",
    heroEyebrow: "Order update",
    heroTitle,
    heroSubtitle,
    greeting: order.full_name,
    bodyParagraphs,
    actionBox: renderOrderStatusActionBox({
      orderRef: shortOrderRef(order.id),
      totalFormatted: formatUgx(order.total),
      itemsSummary: orderItemsSummary(items),
      deliveryAddress: orderDeliveryAddress(order),
      trackUrl: orderTrackUrl(order.id),
      statusLabel,
    }),
    footnotes: [
      "Delivery times may vary depending on your location and order volume.",
      "If you did not place this order, please contact One Source support immediately.",
    ],
    footerNote: "You are receiving this because you placed an order with One Source.",
    closingName: "One Source Fulfilment Team",
  });

  await sendBrandedMail({
    to: order.email,
    subject,
    html,
    text: [
      greetingLine(order.full_name),
      "",
      ...bodyParagraphs.map((p) => p.replace(/<[^>]+>/g, "")),
      "",
      `Order #${shortOrderRef(order.id)} · ${statusLabel}`,
      `Total: ${formatUgx(order.total)}`,
      `Track: ${orderTrackUrl(order.id)}`,
      "",
      "One Source Fulfilment Team",
    ].join("\n"),
  });

  return { sent: true };
}

export async function sendOrderConfirmedEmail(order) {
  return sendOrderStatusEmail(order, {
    heroTitle: "Your order is confirmed",
    heroSubtitle: "We're preparing your fresh produce for delivery.",
    statusLabel: "Confirmed — on its way",
    subject: `Order confirmed — #${shortOrderRef(order.id)} · One Source`,
    bodyParagraphs: [
      "Great news — we've confirmed your order and our team is now preparing your items.",
      "Your order is on its way. We'll notify you again when it's dispatched for delivery.",
    ],
  });
}

export async function sendOrderDispatchedEmail(order) {
  return sendOrderStatusEmail(order, {
    heroTitle: "Your order is on its way",
    heroSubtitle: "Our delivery team has dispatched your order.",
    statusLabel: "Out for delivery",
    subject: `Order dispatched — #${shortOrderRef(order.id)} · One Source`,
    bodyParagraphs: [
      "Your One Source order has been dispatched and is heading to your delivery address.",
      "Please ensure someone is available to receive the order. You can track progress using the link below.",
    ],
  });
}

export async function sendOrderPlacedEmail(order) {
  return sendOrderStatusEmail(order, {
    heroTitle: "We've received your order",
    heroSubtitle: "Thank you for shopping with One Source.",
    statusLabel: "Order placed",
    subject: `Order received — #${shortOrderRef(order.id)} · One Source`,
    bodyParagraphs: [
      "Thank you for your order. We've received it and will confirm it shortly.",
      "You'll get another email when your order is confirmed and prepared for delivery.",
    ],
  });
}

export async function sendOrderDeliveredEmail(order) {
  return sendOrderStatusEmail(order, {
    heroTitle: "Your order was delivered",
    heroSubtitle: "We hope you enjoy your fresh produce.",
    statusLabel: "Delivered",
    subject: `Order delivered — #${shortOrderRef(order.id)} · One Source`,
    bodyParagraphs: [
      "Your One Source order has been marked as delivered.",
      "Thank you for shopping with us — we'd love to see you again soon.",
    ],
  });
}

export async function sendLoginOtpEmail({ email, fullName, otp }) {
  const html = renderBrandedEmail({
    headerLabel: "One Source Account",
    heroEyebrow: "Secure sign-in",
    heroTitle: "Your verification code",
    heroSubtitle: "Enter this code to complete your One Source login.",
    greeting: fullName,
    bodyParagraphs: [
      "We received a sign-in request for your One Source account. Use the code below on the login screen to continue.",
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

export { isMailConfigured, isSmtpConfigured };
