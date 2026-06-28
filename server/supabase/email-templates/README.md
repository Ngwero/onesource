# One Source — Supabase email templates

Copy each HTML file into **Supabase Dashboard → Authentication → Email Templates**.

Set **Site URL** to your live shop (e.g. `https://www.onesourco.com`) so the logo loads from `{{ .SiteURL }}/brand/logo-on-dark-horizontal.png`.

## Subject lines (replace default Supabase subjects)

| Template | Subject |
|----------|---------|
| **Reset password** | `Reset your One Source password` |
| **Confirm signup** | `Welcome to One Source — confirm your email` |
| **Magic link** | `Your One Source sign-in code` |
| **Invite user** | `You're invited to One Source` |

Paste `magic-link.html` into the **Magic link** template — it shows `{{ .Token }}` for login OTP (6–8 digits depending on Supabase settings).

Enable in Supabase → **Authentication** → **Providers** → **Email** → turn on **Email OTP**.

## Sender name

**Project Settings → Authentication → SMTP** (or default mailer):

- **Sender name:** `One Source`
- **Sender email:** `noreply@one-sourcebrand.com` (when using custom SMTP)

These templates use a card layout with centred logo, solid OTP box, and professional copy — no Supabase branding.
