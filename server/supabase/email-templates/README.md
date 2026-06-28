# One Source — Supabase email templates

Copy each HTML file into **Supabase Dashboard → Authentication → Email Templates**.

Set **Site URL** to your live shop (e.g. `https://www.onesourco.com`) so the logo loads from `{{ .SiteURL }}/brand/logo-on-dark-stacked.png`.

## Subject lines (replace default Supabase subjects)

| Template | Subject |
|----------|---------|
| **Reset password** | `Reset your One Source password` |
| **Confirm signup** | `Welcome to One Source — confirm your email` |
| **Magic link** | `Your One Source sign-in code` |
| **Invite user** | `You're invited to One Source` |

## Sender name

**Project Settings → Authentication → SMTP** (or default mailer):

- **Sender name:** `One Source`
- **Sender email:** `noreply@one-sourcebrand.com` (when using custom SMTP)

Remove any “Supabase” wording from the default templates — these files are fully branded.
