import { requireSupabase } from './supabase.js';

export const ADMIN_COOKIE = 'onesource_admin_session';

export function isAdminUser(user, adminIds = process.env.ADMIN_USER_IDS || '') {
  const ids = adminIds.split(',').map(id => id.trim()).filter(Boolean);
  return Boolean(user && (ids.includes(user.id) || user.app_metadata?.role === 'admin' ||
    (Array.isArray(user.app_metadata?.roles) && user.app_metadata.roles.includes('admin'))));
}

export function requestToken(req) {
  const authorization = req.get('authorization');
  if (authorization) return { token: /^Bearer\s+(\S+)$/i.exec(authorization)?.[1] || '', cookie: false, supplied: true };
  const cookie = String(req.get('cookie') || '').split(';').map(part => part.trim())
    .find(part => part.startsWith(`${ADMIN_COOKIE}=`));
  return { token: cookie?.slice(ADMIN_COOKIE.length + 1) || '', cookie: Boolean(cookie), supplied: Boolean(cookie) };
}

export function createAuthorization({ getClient = requireSupabase, adminIds } = {}) {
  async function authenticate(req, res, required = false) {
    if (req.auth !== undefined) return true;
    const credentials = requestToken(req);
    req.auth = null;
    req.isAdmin = false;
    if (!credentials.supplied) {
      if (required) res.status(401).json({ error: 'Please sign in to continue.' });
      return !required;
    }
    if (!credentials.token) {
      res.status(401).json({ error: 'Invalid sign-in session.' });
      return false;
    }
    try {
      const { data, error } = await getClient().auth.getUser(credentials.token);
      if (error || !data?.user) {
        res.status(401).json({ error: 'Your session expired. Please sign in again.' });
        return false;
      }
      // Cookie-authenticated writes are only accepted from the same origin.
      if (credentials.cookie && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        const origin = req.get('origin');
        const host = String(req.get('x-forwarded-host') || req.get('host')).split(',')[0].trim();
        if (!origin || new URL(origin).host !== host) {
          res.status(403).json({ error: 'Invalid request origin.' });
          return false;
        }
      }
      req.auth = data.user;
      req.isAdmin = isAdminUser(data.user, adminIds);
      return true;
    } catch {
      res.status(503).json({ error: 'Unable to verify your session. Please try again.' });
      return false;
    }
  }

  async function requireAdmin(req, res, next) {
    res.set('Cache-Control', 'no-store');
    if (!await authenticate(req, res, true)) return;
    if (!req.isAdmin) return res.status(403).json({ error: 'Administrator access is required.' });
    next();
  }

  async function guard(req, res, next) {
    const path = req.path.toLowerCase().replace(/\/+$/, '') || '/';
    const read = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    const admin = /^\/(admin|packaging|suppliers)(\/|$)/.test(path) || req.query.admin === 'true';
    const orders = /^\/orders(\/|$)/.test(path);
    const publicAuth = /^\/auth(\/|$)/.test(path);
    if (admin || (!read && !publicAuth && !(path === '/orders' && req.method === 'POST'))) {
      return requireAdmin(req, res, next);
    }
    if (orders) {
      res.set('Cache-Control', 'no-store');
      // Guest checkout and token-protected confirmation remain available.
      if (!await authenticate(req, res, path === '/orders' && read)) return;
    }
    next();
  }
  return { guard, requireAdmin, authenticate };
}
