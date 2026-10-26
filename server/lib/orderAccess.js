import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from './env.js';

function secret() {
  const key = process.env.ORDER_ACCESS_SECRET || env.supabaseServiceRoleKey;
  if (!key) throw new Error('Order access signing is not configured');
  return key;
}
export function createOrderAccessToken(id, { now = Date.now(), key = secret() } = {}) {
  const payload = `${id}.${Math.floor(now / 1000) + 30 * 24 * 60 * 60}`;
  return `${payload}.${createHmac('sha256', key).update(payload).digest('base64url')}`;
}
export function verifyOrderAccessToken(token, id, { now = Date.now(), key = secret() } = {}) {
  if (typeof token !== 'string' || token.length > 250) return false;
  const [orderId, expires, signature, extra] = token.split('.');
  if (extra || orderId !== id || !/^\d+$/.test(expires || '') || Number(expires) <= now / 1000 || !/^[A-Za-z0-9_-]{43}$/.test(signature || '')) return false;
  const expected = createHmac('sha256', key).update(`${orderId}.${expires}`).digest('base64url');
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
