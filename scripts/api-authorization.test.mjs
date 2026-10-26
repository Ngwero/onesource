import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { createRequire } from 'node:module';
import { createAuthorization, isAdminUser } from '../server/lib/apiAuthorization.js';
import { createOrderAccessToken, verifyOrderAccessToken } from '../server/lib/orderAccess.js';
const require = createRequire(new URL('../server/package.json', import.meta.url));
const express = require('express');
const users = {
  customer: { id: 'customer', user_metadata: { role: 'admin' }, app_metadata: {} },
  admin: { id: 'admin', app_metadata: { role: 'admin' } },
};
const app = express();
app.use('/api', createAuthorization({ adminIds: '', getClient: () => ({ auth: {
  getUser: async token => ({ data: { user: users[token] }, error: !users[token] }),
} }) }).guard);
app.use((req, res) => res.json({ user: req.auth?.id || null, admin: req.isAdmin || false }));
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
after(() => server.close());
const base = `http://127.0.0.1:${server.address().port}`;
const request = (path, token, method = 'GET', headers = {}) => fetch(`${base}/api${path}`, {
  method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
});

test('anonymous catalogue browsing and guest checkout remain public', async () => {
  for (const path of ['/products', '/categories', '/hero/slides', '/notifications', '/kitchen/collage']) {
    assert.equal((await request(path)).status, 200);
  }
  const result = await request('/orders', null, 'POST');
  assert.equal(result.status, 200);
  assert.equal((await result.json()).user, null);
});

test('admin reads, previews and every catalogue mutation reject anonymous users', async () => {
  for (const [path, method] of [['/admin/products','GET'], ['/products?admin=true','GET'], ['/orders?admin=true','GET'], ['/suppliers','GET'], ['/packaging','GET'], ['/products','POST'], ['/products/one','PUT'], ['/products/one','DELETE'], ['/products/one/stock','PATCH'], ['/categories/one','PATCH'], ['/upload/image','POST'], ['/hero/slides','POST'], ['/kitchen/collage','PUT'], ['/notifications','POST'], ['/orders/one','PATCH']]) {
    assert.equal((await request(path, null, method)).status, 401, `${method} ${path}`);
    assert.equal((await request(path, 'customer', method)).status, 403, `${method} ${path}`);
    assert.equal((await request(path, 'admin', method)).status, 200, `${method} ${path}`);
  }
});

test('customer order identity comes from a verified token, not a query parameter', async () => {
  assert.equal((await request('/orders?userId=other')).status, 401);
  assert.equal((await request('/orders', 'expired')).status, 401);
  const r = await request('/orders?userId=other', 'customer');
  assert.equal((await r.json()).user, 'customer');
});

test('user-editable metadata cannot grant admin access', () => {
  assert.equal(isAdminUser(users.customer, ''), false);
  assert.equal(isAdminUser(users.customer, 'customer'), true);
});

test('cookie admin sessions reject cross-origin writes', async () => {
  const cookie = { Cookie: 'onesource_admin_session=admin' };
  assert.equal((await request('/admin/session', null, 'GET', cookie)).status, 200);
  assert.equal((await request('/products', null, 'POST', cookie)).status, 403);
  assert.equal((await request('/products', null, 'POST', {...cookie, Origin: 'https://unrelated.example'})).status, 403);
  assert.equal((await request('/products', null, 'POST', {...cookie, Origin: base})).status, 200);
});

test('guest confirmation tokens are scoped, expire and resist tampering', () => {
  const options = { key: 'test-only-key', now: 1000000 };
  const token = createOrderAccessToken('order-a', options);
  assert.equal(verifyOrderAccessToken(token, 'order-a', options), true);
  assert.equal(verifyOrderAccessToken(token, 'order-b', options), false);
  assert.equal(verifyOrderAccessToken(token + 'x', 'order-a', options), false);
  assert.equal(verifyOrderAccessToken(token, 'order-a', {...options, now: options.now + 31*86400000}), false);
  assert.equal(verifyOrderAccessToken(undefined, 'order-a', options), false);
});

test('malformed Unicode signatures are rejected without throwing', () => {
  const options={key:'test-key',now:0};
  assert.equal(verifyOrderAccessToken(`order.9999999.${'é'.repeat(43)}`,'order',options),false);
});

test('actual order routes enforce ownership and guest confirmation credentials', async () => {
  const {createOrdersRouter}=await import('../server/routes/orders.js');
  const records=[{id:'owned',user_id:'customer'},{id:'other',user_id:'someone-else'},{id:'guest',user_id:null}];
  const db={from:()=>{
    const filters=[];
    const query={select:()=>query,eq:(k,v)=>{filters.push([k,v]);return query;},is:(k,v)=>{filters.push([k,v]);return query;},
      maybeSingle:async()=>({data:records.find(r=>filters.every(([k,v])=>r[k]===v))||null,error:null}),
      order:async()=>({data:records.filter(r=>filters.every(([k,v])=>r[k]===v)),error:null})};
    return query;
  }};
  const instance=express();
  instance.use('/api',createAuthorization({adminIds:'',getClient:()=>({auth:{getUser:async token=>({data:{user:users[token]},error:!users[token]})}})}).guard);
  instance.use('/api/orders',createOrdersRouter({getDb:()=>db}));
  const listener=instance.listen(0,'127.0.0.1');
  await new Promise(resolve=>listener.once('listening',resolve));
  const origin=`http://127.0.0.1:${listener.address().port}/api/orders`;
  try{
    const auth={Authorization:'Bearer customer'};
    assert.equal((await fetch(`${origin}/other?userId=someone-else`,{headers:auth})).status,404);
    assert.equal((await fetch(`${origin}/owned`,{headers:auth})).status,200);
    const list=await fetch(`${origin}?userId=someone-else`,{headers:auth}).then(r=>r.json());
    assert.deepEqual(list.orders.map(o=>o.id),['owned']);
    assert.equal((await fetch(`${origin}/guest`)).status,401);
    const guestToken=createOrderAccessToken('guest');
    assert.equal((await fetch(`${origin}/guest`,{headers:{'X-Order-Token':guestToken}})).status,200);
    assert.equal((await fetch(`${origin}/other`,{headers:{'X-Order-Token':guestToken}})).status,401);
  }finally{listener.close();}
});
