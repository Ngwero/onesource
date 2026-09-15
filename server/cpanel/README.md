# Send auth emails through cPanel

Supabase and Railway run in the **cloud**. Most cPanel hosts **block remote SMTP** on `mail.yourdomain.com`, so login hangs when Supabase tries to send through cPanel SMTP directly.

To **use cPanel mail**, send from **on the same server** via a Supabase **Send Email Hook**.

## Setup (recommended)

### 1. Create the mailbox in cPanel

- Email: `noreply@one-sourcebrand.com`
- Note the password (for reference; this hook uses PHP `mail()` on-server, not remote SMTP)

### 2. Upload the hook script

1. In cPanel → **File Manager**, create a folder e.g. `public_html/onesource-api/`
2. Upload `send-auth-email.php` from this folder
3. Edit the top of the file and set `$HOOK_SECRET` after step 4 (or use cPanel environment variables)

### 3. Configure Supabase

1. **Authentication → Emails → SMTP** → turn **OFF** “Enable custom SMTP”  
   (The hook replaces SMTP; leaving cPanel SMTP on causes hangs.)

2. **Authentication → Hooks → Send Email** → **Create hook**
   - Type: **HTTPS**
   - URL: `https://one-sourcebrand.com/onesource-api/send-auth-email.php`  
     (or your real cPanel domain/path)
   - Click **Generate secret** and copy the full value (`v1,whsec_...`)
   - Paste that secret into `$HOOK_SECRET` in the PHP file

3. **Authentication → URL configuration**
   - Site URL: `https://www.onesourco.com`

4. Paste branded templates from `../supabase/email-templates/` if you still want to edit copy in the dashboard (the hook sends its own HTML when enabled).

### 4. Test

- Try login → OTP email should arrive from `noreply@one-sourcebrand.com`
- Check cPanel → **Track Delivery** if mail does not arrive

---

## Alternative: cPanel SMTP inside Supabase (often blocked)

Only works if your **hosting provider allows remote SMTP** from the internet.

Ask support: *“Please allow external SMTP authentication on ports 587 and 465 for third-party services.”*

If allowed, use in **Supabase → SMTP**:

| Field | Value |
|-------|--------|
| Sender email | `noreply@one-sourcebrand.com` |
| Sender name | `One Source` |
| Host | `mail.one-sourcebrand.com` (or hostname from cPanel) |
| Port | `587` first; try `465` if needed |
| Username | **Full email** `noreply@one-sourcebrand.com` (not “One Source”) |
| Password | Mailbox password |

**Do not** use the Send Email Hook and custom SMTP at the same time.

---

## Railway welcome emails / app OTP / password reset

Railway also cannot reach cPanel SMTP reliably (`535` / blocked ports). Options:

1. **Brevo (recommended)** — set `BREVO_API_KEY` on Railway (HTTPS).
2. **cPanel HTTPS relay** — upload `send-app-mail.php` from this folder to  
   `public_html/onesource-api/send-app-mail.php`, set a shared secret in the PHP  
   (`ONESOURCE_APP_MAIL_SECRET` or edit the file), then on Railway:
   ```
   CPANEL_MAIL_URL=https://one-sourcebrand.com/onesource-api/send-app-mail.php
   CPANEL_MAIL_SECRET=same-secret-as-php
   ```
3. Fix the `noreply@one-sourcebrand.com` mailbox password and update `SMTP_PASS`  
   (only helps hosts that allow remote SMTP).
