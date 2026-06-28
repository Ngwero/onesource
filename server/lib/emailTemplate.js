import { env } from "./env.js";

const OTP_VALID_SECONDS = Number(process.env.OTP_TTL_SECONDS) || 300;

/**
 * One Source branded transactional email layout.
 */
export function renderBrandedEmail({
  eyebrow = "Account",
  title,
  subtitle,
  greeting,
  bodyParagraphs = [],
  actionBox,
  securityNote,
  closingName = "The One Source Team",
}) {
  const shopUrl = env.shopUrl;
  const greetingLine = greeting?.trim()
    ? `Dear ${greeting.trim()},`
    : "Dear customer,";

  const bodyHtml = bodyParagraphs
    .map(
      (p) =>
        `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3d3d3d;">${p}</p>`
    )
    .join("");

  const actionHtml = actionBox
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 28px;">
        <tr><td>${actionBox}</td></tr>
      </table>`
    : "";

  const securityHtml = securityNote
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;background-color:#faf9f6;border-radius:10px;border:1px solid #e8ebe4;">
        <tr>
          <td style="padding:16px 18px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#244a3b;">Security reminder</p>
            <p style="margin:0;font-size:13px;line-height:1.55;color:#5c5c58;">${securityNote}</p>
          </td>
        </tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>One Source</title>
</head>
<body style="margin:0;padding:0;background-color:#eceee9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1c1c;-webkit-font-smoothing:antialiased;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#eceee9;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dde3dc;">

          <tr>
            <td style="background:linear-gradient(180deg,#2e5e4a 0%,#244a3b 100%);padding:28px 32px 24px;text-align:center;">
              <a href="${shopUrl}" style="text-decoration:none;display:inline-block;">
                <img src="${shopUrl}/brand/logo-on-dark-horizontal.png" alt="One Source" width="200" style="display:block;margin:0 auto;border:0;max-width:200px;height:auto;" />
              </a>
              <p style="margin:14px 0 0;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#b4cf5a;">${eyebrow}</p>
            </td>
          </tr>

          <tr>
            <td style="background-color:#faf9f6;padding:24px 32px 8px;border-bottom:1px solid #e8ebe4;">
              <h1 style="margin:0;font-size:22px;line-height:1.3;font-weight:700;color:#1c1c1c;letter-spacing:-0.02em;">${title}</h1>
              ${subtitle ? `<p style="margin:8px 0 0;font-size:15px;line-height:1.5;color:#5c5c58;">${subtitle}</p>` : ""}
            </td>
          </tr>

          <tr>
            <td style="padding:28px 32px 8px;">
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#1c1c1c;">${greetingLine}</p>
              ${bodyHtml}
              ${actionHtml}
              ${securityHtml}
              <p style="margin:0;font-size:15px;line-height:1.6;color:#1c1c1c;">
                Kind regards,<br />
                <strong style="color:#244a3b;">${closingName}</strong>
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color:#244a3b;padding:22px 32px;text-align:center;">
              <p style="margin:0 0 12px;font-size:12px;font-weight:600;">
                <a href="${shopUrl}" style="color:#edf3e0;text-decoration:none;margin:0 8px;">Shop</a>
                <span style="color:#5c7a68;">·</span>
                <a href="${shopUrl}/account" style="color:#edf3e0;text-decoration:none;margin:0 8px;">Account</a>
                <span style="color:#5c7a68;">·</span>
                <a href="${shopUrl}/orders" style="color:#edf3e0;text-decoration:none;margin:0 8px;">Orders</a>
              </p>
              <p style="margin:0;font-size:11px;line-height:1.5;color:#9bb5a8;">© ${new Date().getFullYear()} One Source · Fresh produce delivered across Uganda</p>
              <p style="margin:8px 0 0;font-size:10px;color:#7a9488;">This is an automated message. Please do not reply.</p>
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
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td align="center" style="background-color:#f4f8f5;border:1px solid #c8dcc8;border-radius:12px;padding:28px 20px;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#5c7a68;">Your verification code</p>
          <p style="margin:0;font-size:34px;font-weight:700;letter-spacing:0.28em;color:#244a3b;font-family:'Courier New',Courier,monospace;line-height:1.2;">${otp}</p>
          <p style="margin:14px 0 0;font-size:12px;color:#5c5c58;">Valid for ${OTP_VALID_SECONDS} seconds · Do not share this code</p>
        </td>
      </tr>
    </table>`;
}

export function renderResetActionBox(resetLink) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td align="center" style="padding:8px 0 24px;">
          <a href="${resetLink}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;background-color:#2e5e4a;border-radius:8px;">Reset password</a>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 18px;background-color:#f4f8f5;border:1px solid #c8dcc8;border-radius:10px;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#5c7a68;">Or copy this link</p>
          <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;">
            <a href="${resetLink}" style="color:#2e5e4a;text-decoration:underline;">${resetLink}</a>
          </p>
        </td>
      </tr>
    </table>`;
}

export function renderWelcomeActionBox(shopUrl) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td align="center" style="padding:8px 0 24px;">
          <a href="${shopUrl}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;background-color:#2e5e4a;border-radius:8px;">Browse the shop</a>
        </td>
      </tr>
    </table>`;
}

export function defaultOtpSecurityNote() {
  return `One Source will never ask for this code by phone or message. If you did not try to sign in, you can ignore this email and your account will remain secure.`;
}

export function defaultSecurityNote() {
  return `If you did not request this change, no action is needed. Your account will remain secure and you can safely ignore this email.`;
}

/** @deprecated Use defaultOtpSecurityNote */
export function defaultOtpFootnotes() {
  return [defaultOtpSecurityNote()];
}

/** @deprecated Use defaultSecurityNote */
export function defaultSecurityFootnotes() {
  return [defaultSecurityNote()];
}

export { OTP_VALID_SECONDS };
