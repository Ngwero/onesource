import { env } from "./env.js";

const OTP_VALID_SECONDS = Number(process.env.OTP_TTL_SECONDS) || 300;

/** One Source email brand tokens (matches web/mobile). */
export const EMAIL_BRAND = {
  ink: "#1c1c1c",
  textMuted: "#5c5c58",
  accent: "#2e5e4a",
  accentDark: "#244a3b",
  accentDeep: "#1a3d30",
  lemon: "#b4cf5a",
  highlight: "#f0c947",
  accentLight: "#edf3e0",
  boxTint: "#f4f7ef",
  canvas: "#eceee9",
  surface: "#ffffff",
  muted: "#faf9f6",
  footer: "#1c3d2f",
  footerMuted: "#9bb5a8",
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatGreeting(greeting) {
  const name = greeting?.trim();
  return name ? `HI ${name.toUpperCase()},` : "HI THERE,";
}

function renderFootnotes(footnotes = []) {
  if (!footnotes.length) return "";
  const items = footnotes
    .map(
      (note, i) =>
        `<tr>
          <td valign="top" width="18" style="padding:0 8px 10px 0;font-size:12px;line-height:1.55;color:${EMAIL_BRAND.textMuted};font-weight:700;">${String.fromCharCode(97 + i)}.</td>
          <td style="padding:0 0 10px;font-size:12px;line-height:1.55;color:${EMAIL_BRAND.textMuted};">${note}</td>
        </tr>`
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:22px 0 0;">${items}</table>`;
}

function renderDetailRows(rows = []) {
  if (!rows.length) return "";
  const cells = rows
    .map(
      ({ label, value }) =>
        `<tr>
          <td style="padding:0 0 8px;font-size:13px;line-height:1.5;color:${EMAIL_BRAND.ink};">
            <span style="font-weight:700;color:${EMAIL_BRAND.accentDark};">${escapeHtml(label)}:</span>
            ${value}
          </td>
        </tr>`
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 auto;max-width:380px;">${cells}</table>`;
}

function renderBoxTitle(title) {
  if (!title) return "";
  return `<p style="margin:0 0 16px;font-size:15px;font-weight:800;line-height:1.35;color:${EMAIL_BRAND.accentDark};text-align:center;letter-spacing:0.02em;">${escapeHtml(title)}</p>`;
}

function renderDashedActionBox(innerHtml, title = "") {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0 10px;">
    <tr>
      <td style="border:2px dashed ${EMAIL_BRAND.accent};border-radius:12px;padding:26px 24px 24px;background-color:${EMAIL_BRAND.boxTint};text-align:center;">
        ${renderBoxTitle(title)}
        ${innerHtml}
      </td>
    </tr>
  </table>`;
}

function renderCtaButton(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0 0;">
    <tr>
      <td align="center">
        <a href="${href}" style="display:inline-block;min-width:200px;padding:14px 28px;font-size:12px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#ffffff;text-decoration:none;background-color:${EMAIL_BRAND.accentDark};border-radius:6px;border:1px solid ${EMAIL_BRAND.accentDeep};">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

function renderEmailHeader(shopUrl, logoUrl, headerLabel) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr>
      <td align="left" valign="middle" width="34%">
        <a href="${shopUrl}" style="text-decoration:none;">
          <img src="${logoUrl}" alt="One Source" width="108" style="display:block;border:0;max-width:108px;height:auto;" />
        </a>
      </td>
      <td align="center" valign="middle" width="32%" style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#ffffff;line-height:1.3;">
        ${escapeHtml(headerLabel)}
      </td>
      <td align="right" valign="middle" width="34%">
        <a href="${shopUrl}" style="font-size:10px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#ffffff;text-decoration:underline;">Go to shop</a>
      </td>
    </tr>
  </table>`;
}

/**
 * RukaPay-style layout: header bar, hero banner, dashed action box, footnotes.
 */
export function renderBrandedEmail({
  headerLabel = "One Source",
  heroEyebrow = "One Source",
  heroTitle,
  heroSubtitle,
  greeting,
  bodyParagraphs = [],
  actionBox,
  footnotes = [],
  securityNote,
  footerNote = "You are receiving this because you have a One Source account or placed an order with us.",
  closingName = "One Source Account Team",
}) {
  const shopUrl = env.shopUrl;
  const heroImage = `${shopUrl}/brand/email-hero.jpg`;
  const logoUrl = `${shopUrl}/brand/logo-on-dark-stacked.png`;
  const greetingLine = formatGreeting(greeting);

  const bodyHtml = bodyParagraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:14px;line-height:1.65;color:${EMAIL_BRAND.ink};">${p}</p>`
    )
    .join("");

  const combinedFootnotes = [...footnotes];
  if (securityNote) {
    const alreadyCovered = combinedFootnotes.some((n) => n.includes(securityNote.slice(0, 40)));
    if (!alreadyCovered) combinedFootnotes.push(securityNote);
  }
  const footnotesHtml = renderFootnotes(combinedFootnotes);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>One Source</title>
</head>
<body style="margin:0;padding:0;background-color:${EMAIL_BRAND.canvas};font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${EMAIL_BRAND.ink};-webkit-font-smoothing:antialiased;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${EMAIL_BRAND.canvas};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:${EMAIL_BRAND.surface};border-radius:4px;overflow:hidden;box-shadow:0 2px 8px rgba(28,28,28,0.06);">

          <!-- Top bar -->
          <tr>
            <td style="background-color:${EMAIL_BRAND.accentDark};padding:16px 22px;">
              ${renderEmailHeader(shopUrl, logoUrl, headerLabel)}
            </td>
          </tr>

          <!-- Hero banner -->
          <tr>
            <td bgcolor="${EMAIL_BRAND.accentDark}" background="${heroImage}" style="background-color:${EMAIL_BRAND.accentDark};background-image:linear-gradient(105deg, rgba(26,61,48,0.92) 0%, rgba(36,74,59,0.72) 45%, rgba(46,94,74,0.35) 100%), url('${heroImage}');background-size:cover;background-position:center center;padding:40px 30px 36px;">
              <!--[if gte mso 9]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;">
                <v:fill type="frame" src="${heroImage}" color="${EMAIL_BRAND.accentDark}" />
                <v:textbox inset="0,0,0,0">
              <![endif]-->
              <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${EMAIL_BRAND.lemon};">${escapeHtml(heroEyebrow)}</p>
              <h1 style="margin:0 0 12px;font-size:28px;line-height:1.18;font-weight:800;color:#ffffff;letter-spacing:-0.02em;max-width:440px;">${escapeHtml(heroTitle)}</h1>
              ${heroSubtitle ? `<p style="margin:0;font-size:14px;line-height:1.55;color:${EMAIL_BRAND.accentLight};max-width:420px;">${escapeHtml(heroSubtitle)}</p>` : ""}
              <!--[if gte mso 9]></v:textbox></v:rect><![endif]-->
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px 30px 26px;background-color:${EMAIL_BRAND.surface};">
              <p style="margin:0 0 16px;font-size:14px;font-weight:800;letter-spacing:0.04em;color:${EMAIL_BRAND.ink};">${greetingLine}</p>
              ${bodyHtml}
              ${actionBox ?? ""}
              ${footnotesHtml}
              <p style="margin:22px 0 0;font-size:12px;line-height:1.55;color:${EMAIL_BRAND.textMuted};">${escapeHtml(footerNote)}</p>
              <p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:${EMAIL_BRAND.ink};">
                Regards,<br />
                <strong style="color:${EMAIL_BRAND.accentDark};">${escapeHtml(closingName)}</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:${EMAIL_BRAND.footer};padding:18px 28px;text-align:center;">
              <p style="margin:0 0 8px;font-size:11px;line-height:1.5;color:${EMAIL_BRAND.footerMuted};">© ${new Date().getFullYear()} One Source · Fresh produce delivered across Uganda</p>
              <p style="margin:0;font-size:10px;line-height:1.5;color:#7a9488;">This is an automated message. Please do not reply.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderOtpActionBox(otp) {
  const inner = `
    <p style="margin:0 0 12px;font-size:32px;font-weight:800;letter-spacing:0.24em;color:${EMAIL_BRAND.accentDark};font-family:'Courier New',Courier,monospace;line-height:1.2;">${escapeHtml(otp)}</p>
    <p style="margin:0;font-size:12px;line-height:1.5;color:${EMAIL_BRAND.textMuted};">Valid for ${OTP_VALID_SECONDS} seconds · Do not share this code</p>`;
  return renderDashedActionBox(inner, "Login code");
}

export function renderResetActionBox(resetLink, email) {
  const inner = `
    ${renderDetailRows([
      { label: "Account", value: `<strong>${escapeHtml(email)}</strong>` },
      { label: "Action", value: "Password reset requested" },
    ])}
    <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:${EMAIL_BRAND.textMuted};">Click below to choose a new password. This link can only be used once.</p>
    ${renderCtaButton(resetLink, "Reset password")}
    <p style="margin:16px 0 0;font-size:11px;line-height:1.5;word-break:break-all;color:${EMAIL_BRAND.textMuted};text-align:left;">
      Or copy this link:<br />
      <a href="${resetLink}" style="color:${EMAIL_BRAND.accent};text-decoration:underline;">${escapeHtml(resetLink)}</a>
    </p>`;
  return renderDashedActionBox(inner, "Password reset");
}

export function renderConfirmActionBox(confirmLink, email) {
  const inner = `
    ${renderDetailRows([
      { label: "Email", value: `<strong>${escapeHtml(email)}</strong>` },
      { label: "Action", value: "Confirm your email address" },
    ])}
    <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:${EMAIL_BRAND.textMuted};">One step left to activate your account and start shopping.</p>
    ${renderCtaButton(confirmLink, "Confirm email")}
  `;
  return renderDashedActionBox(inner, "Account activation");
}

export function renderInviteActionBox(inviteLink, email) {
  const inner = `
    ${renderDetailRows([
      { label: "Email", value: `<strong>${escapeHtml(email)}</strong>` },
      { label: "Action", value: "Accept your invitation" },
    ])}
    <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:${EMAIL_BRAND.textMuted};">Set up your account to browse fresh produce and track orders.</p>
    ${renderCtaButton(inviteLink, "Accept invitation")}
  `;
  return renderDashedActionBox(inner, "Invitation");
}

export function renderWelcomeActionBox(shopUrl) {
  const inner = `
    <p style="margin:0 0 4px;font-size:13px;line-height:1.5;color:${EMAIL_BRAND.textMuted};">Your account is ready. Start browsing our range of fresh produce.</p>
    ${renderCtaButton(shopUrl, "Browse the shop")}
  `;
  return renderDashedActionBox(inner, "Welcome aboard");
}

export function renderOrderStatusActionBox({
  orderRef,
  totalFormatted,
  itemsSummary,
  deliveryAddress,
  trackUrl,
  statusLabel,
}) {
  const inner = `
    ${renderDetailRows([
      { label: "Status", value: `<strong style="color:${EMAIL_BRAND.accentDark};">${escapeHtml(statusLabel)}</strong>` },
      { label: "Total", value: `<strong>${escapeHtml(totalFormatted)}</strong>` },
      { label: "Items", value: escapeHtml(itemsSummary) },
      ...(deliveryAddress
        ? [{ label: "Deliver to", value: escapeHtml(deliveryAddress) }]
        : []),
    ])}
    <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:${EMAIL_BRAND.textMuted};">Track your order anytime from your account.</p>
    ${renderCtaButton(trackUrl, "Track order")}
  `;
  return renderDashedActionBox(inner, `Order : #${orderRef}`);
}

export function defaultOtpFootnotes() {
  return [
    "Enter this code on the One Source login screen to complete sign-in.",
    "Do not share this code with anyone — One Source will never ask for it by phone or message.",
    "If you did not try to sign in, you can ignore this email and your account will remain secure.",
  ];
}

export function defaultResetFootnotes() {
  return [
    "Use the button above to set a new password. The link expires after a short time.",
    "Do not share password reset links with anyone.",
    "If you did not request a reset, no action is needed — your password will stay the same.",
  ];
}

export function defaultConfirmFootnotes() {
  return [
    "Confirm your email to activate your One Source account.",
    "If you did not create an account, you can safely ignore this email.",
  ];
}

export function defaultOtpSecurityNote() {
  return defaultOtpFootnotes()[2];
}

export function defaultSecurityNote() {
  return defaultResetFootnotes()[2];
}

/** @deprecated Use defaultOtpFootnotes */
export function defaultOtpFootnotesLegacy() {
  return [defaultOtpSecurityNote()];
}

/** @deprecated Use defaultSecurityNote */
export function defaultSecurityFootnotes() {
  return [defaultSecurityNote()];
}

export { OTP_VALID_SECONDS };
