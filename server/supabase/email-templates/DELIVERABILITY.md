# Email deliverability (inbox, not spam)

One Source emails are sent from `noreply@one-sourcebrand.com` via your SMTP server.

## Images in emails

Logo and hero banner are **embedded in every email** (inline attachments). They display even when Gmail blocks remote images.

## Stay out of spam

### 1. DNS records (cPanel → Email Deliverability)

For domain `one-sourcebrand.com`, ensure these are set:

| Record | Purpose |
|--------|---------|
| **SPF** | Authorises your mail server to send for `@one-sourcebrand.com` |
| **DKIM** | Cryptographic signature — enable in cPanel for the mailbox domain |
| **DMARC** | Policy for failed SPF/DKIM (`v=DMARC1; p=none; rua=mailto:admin@one-sourcebrand.com`) |

In cPanel: **Email** → **Email Deliverability** → run **Repair** on `one-sourcebrand.com`.

### 2. Ask users to mark “Not spam” once

After the first email lands in spam, open it → **Report not spam**. Gmail learns for future messages.

### 3. Use a relay for production (recommended)

cPanel SMTP from Railway/cloud often has **low reputation**. For reliable inbox delivery use:

- [Brevo](https://www.brevo.com) (free tier)
- SendGrid or Resend

Set their SMTP credentials in Railway variables. Verify the sending domain in their dashboard (adds SPF/DKIM automatically).

### 4. What we already avoid in templates

- No 2MB remote hero images (compressed ~60KB, embedded)
- No long raw Supabase URLs in the HTML body (button only; link stays in plain-text part)
- Registered-email validation before sending

### 5. Plain-text part

Every email includes a `text/plain` version for clients that prefer it.
