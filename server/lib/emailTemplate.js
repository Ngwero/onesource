import { env } from "./env.js";

const OTP_VALID_SECONDS = Number(process.env.OTP_TTL_SECONDS) || 300;

/**
 * One Source branded email layout (Airtel-style structure, brand colours).
 */
export function renderBrandedEmail({
  headerLabel = "Account",
  heroTag = "One Source",
  heroTitle,
  heroSubtitle,
  greeting,
  bodyParagraphs = [],
  actionBox,
  footnotes = [],
  closingName = "One Source Account Team",
}) {
  const shopUrl = env.shopUrl;
  const greetingLine = greeting?.trim() ? `Hi ${greeting.trim()},` : "Hi there,";

  const bodyHtml = bodyParagraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#1c1c1c;">${p}</p>`
    )
    .join("");

  const footnotesHtml = footnotes.length
    ? `<div style="margin:20px 0 0;padding-top:16px;border-top:1px solid #e3e1da;">${footnotes
        .map(
          (note, i) =>
            `<p style="margin:0 0 8px;font-size:11px;line-height:1.55;color:#5c5c58;"><strong style="color:#2e5e4a;">${String.fromCharCode(97 + i)}.</strong> ${note}</p>`
        )
        .join("")}</div>`
    : "";

  const actionHtml = actionBox
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0 8px;">
        <tr>
          <td style="border:2px dashed #2e5e4a;border-radius:8px;padding:22px 20px;background-color:#faf9f6;text-align:center;">
            ${actionBox}
          </td>
        </tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>One Source</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f2ee;font-family:Arial,Helvetica,sans-serif;color:#1c1c1c;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f3f2ee;">
    <tr>
      <td align="center" style="padding:20px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#244a3b;padding:14px 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="left" valign="middle" width="40%">
                    <img src="${shopUrl}/brand/logo-on-dark-stacked.png" alt="One Source" width="130" style="display:block;border:0;max-width:130px;height:auto;" />
                  </td>
                  <td align="center" valign="middle" width="35%">
                    <span style="font-size:13px;font-weight:700;color:#f0c947;letter-spacing:0.04em;">One Source</span>
                  </td>
                  <td align="right" valign="middle" width="25%">
                    <a href="${shopUrl}" style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#edf3e0;text-decoration:none;">Go to shop</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="background:linear-gradient(135deg,#2e5e4a 0%,#244a3b 60%,#1a3d30 100%);padding:28px 24px 24px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#b4cf5a;">${heroTag}</p>
              <h1 style="margin:0 0 10px;font-size:24px;line-height:1.2;font-weight:800;color:#ffffff;">${heroTitle}</h1>
              ${heroSubtitle ? `<p style="margin:0;font-size:14px;line-height:1.5;color:#d8e8d8;">${heroSubtitle}</p>` : ""}
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:28px 24px 20px;">
              <p style="margin:0 0 16px;font-size:14px;font-weight:700;color:#1c1c1c;">${greetingLine}</p>
              ${bodyHtml}
              ${actionHtml}
              ${footnotesHtml}
              <p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:#1c1c1c;">
                Regards,<br />
                <strong>${closingName}</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#1c3d2f;padding:18px 24px;text-align:center;">
              <p style="margin:0 0 10px;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">
                <a href="${shopUrl}" style="color:#edf3e0;text-decoration:none;">Shop</a>
                <span style="color:#5c7a68;">&nbsp;|&nbsp;</span>
                <a href="${shopUrl}/orders" style="color:#edf3e0;text-decoration:none;">Orders</a>
                <span style="color:#5c7a68;">&nbsp;|&nbsp;</span>
                <a href="${shopUrl}/account" style="color:#edf3e0;text-decoration:none;">Account</a>
              </p>
              <p style="margin:0;font-size:10px;line-height:1.5;color:#9bb5a8;">© ${new Date().getFullYear()} One Source. Quality fresh produce delivered across Uganda.</p>
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
  return `
    <p style="margin:0 0 6px;font-size:12px;color:#5c5c58;">Please use the OTP below to complete your login on the One Source shop.</p>
    <p style="margin:0;font-size:28px;font-weight:800;letter-spacing:0.2em;color:#2e5e4a;">OTP : ${otp}</p>
  `;
}

export function renderResetActionBox(resetLink) {
  return `
    <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:#1c1c1c;">Reset your password</p>
    <a href="${resetLink}" style="display:inline-block;padding:12px 24px;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#ffffff;text-decoration:none;background-color:#2e5e4a;border-radius:999px;">Reset password</a>
    <p style="margin:16px 0 0;font-size:11px;line-height:1.5;color:#5c5c58;word-break:break-all;">
      <a href="${resetLink}" style="color:#2e5e4a;">${resetLink}</a>
    </p>
  `;
}

export function renderWelcomeActionBox(shopUrl) {
  return `
    <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:#1c1c1c;">Start shopping fresh produce</p>
    <a href="${shopUrl}" style="display:inline-block;padding:12px 24px;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#ffffff;text-decoration:none;background-color:#2e5e4a;border-radius:999px;">Browse the shop</a>
  `;
}

export function defaultOtpFootnotes() {
  return [
    `The above OTP is valid for ${OTP_VALID_SECONDS} seconds only.`,
    "Please do not share your login credentials or OTP with anyone.",
    `Bookmark <a href="${env.shopUrl}" style="color:#2e5e4a;">${env.shopUrl}</a> for quick access.`,
    "This is an auto-generated message. Please do not reply to this email.",
    "One Source is not liable for unauthorized access caused by sharing your OTP or password.",
    `For support, contact us via <a href="${env.shopUrl}/account" style="color:#2e5e4a;">your account page</a>.`,
  ];
}

export function defaultSecurityFootnotes() {
  return [
    "This link is valid for a limited time and can only be used once.",
    "Please do not share your login credentials with anyone.",
    `Bookmark <a href="${env.shopUrl}" style="color:#2e5e4a;">${env.shopUrl}</a> for quick access.`,
    "This is an auto-generated message. Please do not reply to this email.",
    "One Source is not liable for unauthorized access caused by sharing your password.",
    `For support, contact us via <a href="${env.shopUrl}/account" style="color:#2e5e4a;">your account page</a>.`,
  ];
}

export { OTP_VALID_SECONDS };
