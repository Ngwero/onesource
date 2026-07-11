import dns from "dns/promises";
import { isAnonKeyConfigured } from "../lib/authCredentials.js";
import { env, getSupabaseConfigErrors, getSmtpConfigErrors, isSupabaseConfigured, isSmtpConfigured, isMailConfigured, getMailTransportLabel } from "../lib/env.js";
import { verifySmtpConnection } from "../lib/mail.js";

const missing = getSupabaseConfigErrors();

console.log("Environment check (server/.env)\n");
console.log(`  PORT: ${env.port}`);
console.log(`  SUPABASE_URL: ${env.supabaseUrl ? "set" : "missing"}`);
console.log(
  `  SUPABASE_SERVICE_ROLE_KEY: ${env.supabaseServiceRoleKey ? "set" : "missing"}`
);
console.log(`  SUPABASE_ANON_KEY: ${isAnonKeyConfigured() ? "set" : "missing (needed for login OTP)"}`);

if (!isSupabaseConfigured()) {
  console.error(
    `\nMissing: ${missing.join(", ")}. Copy server/.env.example to server/.env and add your Supabase credentials.`
  );
  process.exit(1);
}

let host = "";
try {
  host = new URL(env.supabaseUrl).hostname;
} catch {
  console.error("\nSUPABASE_URL is not a valid URL.");
  process.exit(1);
}

try {
  await dns.lookup(host);
  console.log(`  SUPABASE_HOST: ${host} resolves`);
} catch {
  console.error(
    `\nSUPABASE_URL host "${host}" does not resolve (project deleted or wrong URL).`
  );
  console.error(
    "The API will serve products from server/seed-data.json until you update server/.env."
  );
  process.exit(1);
}

console.log("\nSupabase env vars look good.");

console.log(`\nMail transport: ${getMailTransportLabel()}`);
if (env.brevoApiKey) {
  console.log("  BREVO_API_KEY: set (HTTPS — recommended for Railway)");
} else if (env.resendApiKey) {
  console.log("  RESEND_API_KEY: set (HTTPS)");
}

const smtpMissing = getSmtpConfigErrors();
if (!isMailConfigured()) {
  console.warn(`\nEmail: not configured.`);
  console.warn("On Railway set BREVO_API_KEY (HTTPS). SMTP is blocked on Hobby plans.");
  console.warn(`Or set SMTP: ${smtpMissing.join(", ")} for local/dev.`);
} else if (isSmtpConfigured() && !env.brevoApiKey && !env.resendApiKey) {
  console.log(`\nSMTP: ${env.smtp.host}:${env.smtp.port} (${env.smtp.from})`);
  const smtpCheck = await verifySmtpConnection();
  if (smtpCheck.ok) {
    console.log("SMTP connection: verified");
  } else {
    console.error(`SMTP connection failed: ${smtpCheck.error}`);
    console.error("Tip: On Railway Hobby, use BREVO_API_KEY instead of cPanel SMTP.");
    process.exit(1);
  }
}

process.exit(0);
