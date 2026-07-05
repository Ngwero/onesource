# One Source — Supabase email templates

Copy each HTML file into **Supabase Dashboard → Authentication → Email Templates**.

Set **Site URL** to your live shop (e.g. `https://www.onesourco.com`) so logos and the hero image load from your domain.

## Hero banner image

Upload a wide produce photo to your site at:

`public/brand/email-hero.jpg` (recommended **1200×480px**)

If the image is missing, the hero still shows your brand green gradient with white headline text.

## Subject lines (replace default Supabase subjects)

| Template | Subject |
|----------|---------|
| **Reset password** | `Reset your One Source password` |
| **Confirm signup** | `Welcome to One Source — confirm your email` |
| **Magic link** | `Your One Source sign-in code` |
| **Invite user** | `You're invited to One Source` |

Paste `magic-link.html` into the **Magic link** template — it shows `{{ .Token }}` for login OTP (6–8 digits depending on Supabase settings).

Enable in Supabase → **Authentication** → **Providers** → **Email** → turn on **Email OTP**.

## Layout

Templates follow a modern transactional layout (RukaPay-style, One Source branding):

- Dark green header bar with logo · product label · **Go to shop** link
- Hero banner with fresh produce photo overlay and headline
- **HI [NAME],** greeting and body copy
- Dashed green action box with title, details + rectangular CTA button
- Numbered footnotes (a, b, c), disclaimer, and dark footer

Brand colours: `#244a3b` / `#2e5e4a` (green), `#f0c947` (gold accent), `#b4cf5a` (lemon).

## Sender name

**Project Settings → Authentication → SMTP** (or default mailer):

- **Sender name:** `One Source`
- **Sender email:** `noreply@one-sourcebrand.com` (when using custom SMTP)

Server-sent mail (Brevo/SMTP via Railway) uses the same layout from `server/lib/emailTemplate.js`.
