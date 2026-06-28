# Deploy One Source on Railway

One Railway service runs **everything**:

| URL path | What |
|----------|------|
| `/` | Shop (React) |
| `/api/*` | API |
| `/admin` | Admin panel |
| `/uploads/*` | Product images |

Database stays on **Supabase** (no change).

---

## 1. Create the project

1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. **New project** → **Deploy from GitHub repo** → choose `Ngwero/onesource`.
3. Railway reads `railway.toml` at the repo root and builds automatically.

---

## 2. Environment variables

In Railway → your service → **Variables**, add:

### Required (API)

| Variable | Where to get it |
|----------|-----------------|
| `SUPABASE_URL` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page (service role — keep secret) |

### Required (shop build — Vite bakes these into the bundle)

| Variable | Where to get it |
|----------|-----------------|
| `VITE_SUPABASE_URL` | Same as `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | Supabase → anon public key (not service role) |

### Optional but recommended

| Variable | Purpose |
|----------|---------|
| `SHOP_URL` | Public shop URL for password-reset emails. If omitted, Railway uses `https://YOUR-RAILWAY-DOMAIN` automatically. |
| `SMTP_HOST` | Password reset emails |
| `SMTP_PORT` | Usually `587` |
| `SMTP_SECURE` | `false` for port 587 |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | e.g. `One Source <noreply@yourdomain.com>` |

You do **not** need `VITE_API_URL` on Railway — shop and API share the same domain (`/api`).

`PORT` is set by Railway automatically.

---

## 3. Public domain

1. Railway → service → **Settings** → **Networking** → **Generate domain**.
2. You get something like `https://onesource-production.up.railway.app`.
3. Open that URL — you should see the shop.
4. Admin: `https://YOUR-DOMAIN/admin`
5. Health check: `https://YOUR-DOMAIN/api/health`

---

## 4. Supabase auth URLs

Supabase → **Authentication** → **URL configuration**:

- **Site URL:** `https://YOUR-RAILWAY-DOMAIN`
- **Redirect URLs:** add `https://YOUR-RAILWAY-DOMAIN/reset-password`

If you set a custom domain later, update these too.

---

## 5. Custom domain (optional)

Railway → **Settings** → **Networking** → **Custom domain** → add e.g. `onesource.com`.

Then set `SHOP_URL=https://onesource.com` and update Supabase redirect URLs.

---

## 6. Verify after deploy

- [ ] Shop loads at `/`
- [ ] Products appear (API + Supabase connected)
- [ ] Login / signup works
- [ ] `/admin` loads
- [ ] `/api/health` returns `"ok": true`
- [ ] Forgot password sends email (if SMTP is set)

---

## Local vs production

| | Local dev | Railway |
|--|-----------|---------|
| Shop | `npm run dev` → :5174 | Built into `dist/`, served by Express |
| API | `cd server && npm run dev` → :3001 | Same process as shop |
| Env files | `.env` + `server/.env` | Railway Variables dashboard |

---

## Troubleshooting

**Build fails on TypeScript**  
Check deploy logs. Fix locally with `npm run build`.

**Shop loads but no products**  
Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Railway variables.

**Auth errors in browser**  
Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set (needed at **build** time — redeploy after adding them).

**Uploads disappear after redeploy**  
Railway disk is ephemeral. Enable Supabase Storage (`USE_SUPABASE_STORAGE=true` in server env) for production images.
