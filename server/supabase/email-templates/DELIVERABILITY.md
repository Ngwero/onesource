# Email deliverability (inbox, not spam)

One Source transactional emails (password reset, login OTP, orders) are sent from
`noreply@one-sourcebrand.com`.

## Production on Railway (important)

Railway **Hobby / Trial** blocks outbound SMTP (ports 25/465/587). That is why
password reset fails with “mail server may be unreachable” when using
`mail.one-sourcebrand.com` from Railway.

**Use Brevo over HTTPS instead:**

1. Sign up at [brevo.com](https://www.brevo.com) (free tier is enough to start).
2. **Senders** → add `noreply@one-sourcebrand.com` and verify the domain (SPF/DKIM).
3. **SMTP & API → API Keys** → create a key.
4. In Railway → your service → **Variables**:

```
BREVO_API_KEY=xkeysib-xxxxxxxx
SMTP_FROM="One Source <noreply@one-sourcebrand.com>"
SHOP_URL=https://www.onesourco.com
```

5. Redeploy. Password reset / OTP / order emails will use the Brevo HTTPS API.

Optional: `RESEND_API_KEY=re_...` instead of Brevo.

SMTP_* vars can stay for local development; production prefers `BREVO_API_KEY` when set.

## Images in emails

- **SMTP path:** logo and hero are embedded as inline attachments (CID).
- **Brevo/Resend HTTPS:** images load from your shop URL (`SHOP_URL/brand/...`).

## Stay out of spam

### 1. DNS records

For `one-sourcebrand.com`, ensure SPF, DKIM, and DMARC are set (cPanel → Email Deliverability, or Brevo’s domain wizard when verifying the sender).

### 2. Ask users to mark “Not spam” once

After the first email lands in spam, open it → **Report not spam**.

### 3. What we already avoid in templates

- No huge remote hero images
- No long raw Supabase URLs in the HTML body (button only)
- Registered-email validation before sending

### 4. Plain-text part

Every email includes a `text/plain` version for clients that prefer it.
