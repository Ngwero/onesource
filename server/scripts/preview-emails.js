/**
 * Write branded email previews to server/public/email-previews/
 * Open: http://localhost:3001/email-previews/index.html
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderBrandedEmail,
  renderOtpActionBox,
  renderResetActionBox,
  renderWelcomeActionBox,
  renderOrderStatusActionBox,
  defaultOtpFootnotes,
  defaultResetFootnotes,
} from "../lib/emailTemplate.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../public/email-previews");

const samples = [
  {
    file: "login-otp.html",
    label: "Login OTP",
    html: renderBrandedEmail({
      headerLabel: "One Source Account",
      heroEyebrow: "Secure sign-in",
      heroTitle: "Your verification code",
      heroSubtitle: "Enter this code to complete your One Source login.",
      greeting: "Emmanuel Ngwero",
      bodyParagraphs: [
        "We received a sign-in request for your One Source account. Use the code below on the login screen to continue.",
      ],
      actionBox: renderOtpActionBox("482916"),
      footnotes: defaultOtpFootnotes(),
    }),
  },
  {
    file: "password-reset.html",
    label: "Password reset",
    html: renderBrandedEmail({
      headerLabel: "One Source Account",
      heroEyebrow: "Account security",
      heroTitle: "Reset your password",
      heroSubtitle: "Keep your One Source account secure with a new password.",
      greeting: "Emmanuel Ngwero",
      bodyParagraphs: [
        'A password reset was requested for your One Source account linked to <strong style="color:#244a3b;">user@example.com</strong>.',
      ],
      actionBox: renderResetActionBox(
        "https://www.onesourco.com/reset-password?token=example",
        "user@example.com"
      ),
      footnotes: defaultResetFootnotes(),
    }),
  },
  {
    file: "order-confirmed.html",
    label: "Order confirmed",
    html: renderBrandedEmail({
      headerLabel: "One Source Orders",
      heroEyebrow: "Order update",
      heroTitle: "Your order is confirmed",
      heroSubtitle: "We're preparing your fresh produce for delivery.",
      greeting: "Emmanuel Ngwero",
      bodyParagraphs: [
        "Great news — we've confirmed your order and our team is now preparing your items.",
        "Your order is on its way. We'll notify you again when it's dispatched for delivery.",
      ],
      actionBox: renderOrderStatusActionBox({
        orderRef: "A1B2C3D4",
        totalFormatted: "USh 45,000",
        itemsSummary: "Tomatoes × 2, Onions × 1",
        deliveryAddress: "Plot 12, Kampala Road, Kampala",
        trackUrl: "https://www.onesourco.com/orders/example",
        statusLabel: "Confirmed — on its way",
      }),
      footerNote: "You are receiving this because you placed an order with One Source.",
      closingName: "One Source Fulfilment Team",
    }),
  },
  {
    file: "welcome.html",
    label: "Welcome",
    html: renderBrandedEmail({
      headerLabel: "One Source Shop",
      heroEyebrow: "Welcome aboard",
      heroTitle: "Welcome to One Source",
      heroSubtitle: "Fresh produce delivered across Uganda — your account is ready.",
      greeting: "Emmanuel Ngwero",
      bodyParagraphs: [
        "Thank you for creating your One Source account. You can now track orders, save items, and checkout faster.",
      ],
      actionBox: renderWelcomeActionBox("https://www.onesourco.com"),
    }),
  },
];

fs.mkdirSync(outDir, { recursive: true });

const indexLinks = samples
  .map(
    (s) =>
      `<li><a href="./${s.file}" target="_blank" rel="noopener">${s.label}</a></li>`
  )
  .join("\n");

for (const sample of samples) {
  fs.writeFileSync(path.join(outDir, sample.file), sample.html, "utf8");
}

fs.writeFileSync(
  path.join(outDir, "index.html"),
  `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>One Source email previews</title>
<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 20px;color:#1c1c1c}h1{font-size:1.4rem}a{color:#244a3b}</style>
</head><body>
<h1>One Source email previews</h1>
<p>Branded templates (RukaPay-style layout, One Source colours).</p>
<ul>${indexLinks}</ul>
</body></html>`,
  "utf8"
);

console.log(`Wrote ${samples.length} previews to ${outDir}`);
