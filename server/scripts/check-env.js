import dns from "dns/promises";
import { env, getSupabaseConfigErrors, getSmtpConfigErrors, isSupabaseConfigured, isSmtpConfigured } from "../lib/env.js";
import { verifySmtpConnection } from "../lib/mail.js";

const missing = getSupabaseConfigErrors();

console.log("Environment check (server/.env)\n");
console.log(`  PORT: ${env.port}`);
console.log(`  SUPABASE_URL: ${env.supabaseUrl ? "set" : "missing"}`);
console.log(
  `  SUPABASE_SERVICE_ROLE_KEY: ${env.supabaseServiceRoleKey ? "set" : "missing"}`
);

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

const smtpMissing = getSmtpConfigErrors();
if (!isSmtpConfigured()) {
  console.warn(`\nSMTP: not configured (missing ${smtpMissing.join(", ")}).`);
  console.warn("Password reset emails will not send until SMTP is set in server/.env.");
} else {
  console.log(`\nSMTP: ${env.smtp.host}:${env.smtp.port} (${env.smtp.from})`);
  const smtpCheck = await verifySmtpConnection();
  if (smtpCheck.ok) {
    console.log("SMTP connection: verified");
  } else {
    console.error(`SMTP connection failed: ${smtpCheck.error}`);
    process.exit(1);
  }
}

process.exit(0);
