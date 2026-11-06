import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calcDeliveryFee,
  calcOrderTotal,
  parseOrderRequest,
  priceOrderFromCatalogue,
  DELIVERY_FEE_UGX,
  FREE_DELIVERY_THRESHOLD_UGX,
} from "../server/lib/orderPricing.js";
import { reserveStock } from "../server/lib/stockReservation.js";

const contact = {
  email: "guest@example.com",
  fullName: "Test Guest",
  addressLine1: "1 Market Street",
  city: "Kampala",
  items: [{ productId: "fresh-mango", quantity: 2, unitPrice: 1, title: "Mango" }],
};

function mango(extra = {}) {
  return {
    id: "fresh-mango",
    title: "Mango",
    price: 4500,
    image: "/uploads/mango.jpg",
    in_stock: true,
    stock_quantity: 8,
    published: true,
    ...extra,
  };
}

test("tampered client unit price is replaced by the catalogue price", () => {
  const parsed = parseOrderRequest({
    ...contact,
    items: [{ productId: "fresh-mango", quantity: 2, unitPrice: 1, title: "Mango" }],
    subtotal: 2,
    deliveryFee: 0,
    total: 2,
  });
  assert.ok(!parsed.error);
  const priced = priceOrderFromCatalogue(parsed.lines, [mango()]);
  assert.equal(priced.items[0].unit_price, 4500);
  assert.equal(priced.items[0].line_total, 9000);
  assert.equal(priced.subtotal, 9000);
  assert.equal(priced.delivery_fee, DELIVERY_FEE_UGX);
  assert.equal(priced.total, 9000 + DELIVERY_FEE_UGX);
});

test("unknown, unpublished, and qty < 1 lines are rejected", () => {
  const parsed = parseOrderRequest(contact);
  assert.equal(
    priceOrderFromCatalogue(parsed.lines, []).error,
    "Unknown product: fresh-mango"
  );
  assert.match(
    priceOrderFromCatalogue(parsed.lines, [mango({ published: false })]).error,
    /not available/i
  );
  assert.equal(
    parseOrderRequest({ ...contact, items: [{ productId: "fresh-mango", quantity: 0 }] }).error,
    "Quantity must be at least 1"
  );
});

test("qty above catalogue stock fails that line", () => {
  const parsed = parseOrderRequest({
    ...contact,
    items: [{ productId: "fresh-mango", quantity: 9 }],
  });
  const priced = priceOrderFromCatalogue(parsed.lines, [mango({ stock_quantity: 8 })]);
  assert.equal(priced.status, 409);
  assert.match(priced.error, /stock/i);
});

test("delivery is free once the catalogue subtotal clears the threshold", () => {
  assert.equal(calcDeliveryFee(FREE_DELIVERY_THRESHOLD_UGX - 1), DELIVERY_FEE_UGX);
  assert.equal(calcDeliveryFee(FREE_DELIVERY_THRESHOLD_UGX), 0);
  assert.equal(calcOrderTotal(FREE_DELIVERY_THRESHOLD_UGX).total, FREE_DELIVERY_THRESHOLD_UGX);
});

function memoryProducts(initial) {
  const store = new Map(initial.map((row) => [row.id, { ...row }]));
  const missingRpc = { message: "Could not find the function public.reserve_product_stock" };
  const missingTable = {
    code: "PGRST205",
    message: "Could not find the table in the schema cache",
  };

  function chain(state) {
    return {
      select(columns) {
        state.columns = columns;
        return chain(state);
      },
      eq(column, value) {
        state.filters.push({ column, value, op: "eq" });
        return chain(state);
      },
      gte(column, value) {
        state.filters.push({ column, value, op: "gte" });
        return chain(state);
      },
      lte(column, value) {
        state.filters.push({ column, value, op: "lte" });
        return chain(state);
      },
      update(patch) {
        state.patch = patch;
        return chain(state);
      },
      insert() {
        return {
          async then(resolve) {
            resolve({ data: null, error: missingTable });
          },
        };
      },
      limit() {
        return {
          async then(resolve) {
            resolve({ data: [], error: null });
          },
        };
      },
      async maybeSingle() {
        const id = state.filters.find((f) => f.column === "id")?.value;
        const row = store.get(id);
        if (state.patch) {
          const stockEq = state.filters.find((f) => f.column === "stock_quantity" && f.op === "eq");
          const stockGte = state.filters.find((f) => f.column === "stock_quantity" && f.op === "gte");
          if (!row) return { data: null, error: null };
          if (stockEq && row.stock_quantity !== stockEq.value) return { data: null, error: null };
          if (stockGte && row.stock_quantity < stockGte.value) return { data: null, error: null };
          Object.assign(row, state.patch);
          return { data: { id: row.id, stock_quantity: row.stock_quantity }, error: null };
        }
        return { data: row ? { ...row } : null, error: null };
      },
    };
  }

  return {
    store,
    from(table) {
      if (table === "products") return chain({ filters: [] });
      // Optional ledger tables are not installed in unit tests — signal missing.
      if (table === "stock_reservations" || table === "order_idempotency") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          lte() {
            return this;
          },
          limit() {
            return this;
          },
          insert() {
            return this;
          },
          update() {
            return this;
          },
          upsert() {
            return this;
          },
          async maybeSingle() {
            return { data: null, error: missingTable };
          },
          async then(resolve) {
            resolve({ data: null, error: missingTable });
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
    async rpc() {
      return { data: null, error: missingRpc };
    },
  };
}

test("two overlapping reserves on the last unit: only one succeeds", async () => {
  const db = memoryProducts([
    { id: "fresh-fake-low-stock", stock_quantity: 1, in_stock: true },
  ]);
  const line = { product_id: "fresh-fake-low-stock", quantity: 1 };
  const [first, second] = await Promise.all([
    reserveStock(db, [line]),
    reserveStock(db, [line]),
  ]);
  const wins = [first, second].filter((result) => result.ok);
  const losses = [first, second].filter((result) => !result.ok);
  assert.equal(wins.length, 1);
  assert.equal(losses.length, 1);
  assert.equal(db.store.get("fresh-fake-low-stock").stock_quantity, 0);
  assert.match(losses[0].error, /stock/i);
});

test('fractional, unsafe and malformed inputs are rejected before any database access', () => {
  for (const quantity of [1.5, Infinity, NaN, -1, 10001]) {
    assert.ok(parseOrderRequest({...contact, items: [{productId: 'fresh-mango', quantity}]}).error);
  }
  assert.ok(parseOrderRequest({...contact, email: {value: 'bad'}}).error);
  assert.equal(parseOrderRequest({...contact, userId: 'someone-else'}).contact.user_id, null);
});

test('duplicate product lines are combined before checking stock', () => {
  const parsed = parseOrderRequest({...contact, items: [
    {productId: 'fresh-mango', quantity: 5}, {productId: 'fresh-mango', quantity: 5},
  ]});
  assert.equal(parsed.lines.length, 1);
  assert.equal(priceOrderFromCatalogue(parsed.lines, [mango()]).status, 409);
});

test('rollback restores only its own units after another checkout succeeds', async () => {
  const { releaseStock } = await import('../server/lib/stockReservation.js');
  const db = memoryProducts([{id:'mango',stock_quantity:5,in_stock:true}]);
  const first = await reserveStock(db,[{product_id:'mango',quantity:2}]);
  const second = await reserveStock(db,[{product_id:'mango',quantity:1}]);
  assert.equal(second.ok,true);
  await releaseStock(db, first.reserved, {via:first.via});
  assert.equal(db.store.get('mango').stock_quantity,4);
});

test('disabled stock cannot be reserved even when quantity remains positive', async () => {
  const db=memoryProducts([{id:'disabled',stock_quantity:5,in_stock:false}]);
  const result=await reserveStock(db,[{product_id:'disabled',quantity:1}]);
  assert.equal(result.ok,false);
  assert.equal(db.store.get('disabled').stock_quantity,5);
});

test("catalogue pricing keeps integer UGX minor units", () => {
  const priced = priceOrderFromCatalogue(
    [{ productId: "fresh-mango", quantity: 3 }],
    [mango({ price: 4500.4 })]
  );
  assert.equal(priced.items[0].unit_price, 4500);
  assert.equal(priced.items[0].line_total, 13500);
  assert.equal(priced.currency, "UGX");
  assert.equal(Number.isInteger(priced.total), true);
});

test("checkout hold expires and restores stock without the RPC", async () => {
  const {
    holdCheckoutStock,
    releaseExpiredReservations,
    _resetMemoryHoldsForTests,
  } = await import("../server/lib/stockReservation.js");
  _resetMemoryHoldsForTests();
  const db = memoryProducts([
    { id: "fresh-fake-hold", stock_quantity: 2, in_stock: true },
  ]);
  const hold = await holdCheckoutStock(
    db,
    [{ product_id: "fresh-fake-hold", quantity: 1 }],
    { ttlMs: 1, now: 1_000 }
  );
  assert.equal(hold.ok, true);
  assert.equal(db.store.get("fresh-fake-hold").stock_quantity, 1);
  const released = await releaseExpiredReservations(db, { now: 1_000 + 2 });
  assert.equal(released, 1);
  assert.equal(db.store.get("fresh-fake-hold").stock_quantity, 2);
  _resetMemoryHoldsForTests();
});

test("claimStockForOrder rejects an expired reservation id", async () => {
  const {
    holdCheckoutStock,
    claimStockForOrder,
    _resetMemoryHoldsForTests,
  } = await import("../server/lib/stockReservation.js");
  _resetMemoryHoldsForTests();
  const db = memoryProducts([
    { id: "fresh-fake-claim", stock_quantity: 3, in_stock: true },
  ]);
  const hold = await holdCheckoutStock(
    db,
    [{ product_id: "fresh-fake-claim", quantity: 1 }],
    { ttlMs: 5, now: 10 }
  );
  assert.equal(hold.ok, true);
  const claim = await claimStockForOrder(
    db,
    [{ product_id: "fresh-fake-claim", quantity: 1 }],
    { reservationId: hold.reservationId, now: 10 + 20 }
  );
  assert.equal(claim.ok, false);
  assert.match(claim.error, /expired/i);
  assert.equal(db.store.get("fresh-fake-claim").stock_quantity, 3);
  _resetMemoryHoldsForTests();
});

test("idempotency replays the same order and conflicts on a different payload", async () => {
  const {
    orderRequestFingerprint,
    persistIdempotency,
    lookupIdempotency,
  } = await import("../server/lib/idempotency.js");
  const parsed = parseOrderRequest(contact);
  const fingerprint = orderRequestFingerprint(parsed);
  const db = memoryProducts([]);
  const body = { order: { id: "ord-test-1", total: 9000 } };
  await persistIdempotency(db, {
    key: "checkout-key-1",
    fingerprint,
    orderId: "ord-test-1",
    responseStatus: 201,
    responseBody: body,
  });
  const hit = await lookupIdempotency(db, "checkout-key-1");
  assert.equal(hit.fingerprint, fingerprint);
  assert.equal(hit.responseBody.order.id, "ord-test-1");

  const other = parseOrderRequest({
    ...contact,
    items: [{ productId: "fresh-mango", quantity: 1 }],
  });
  assert.notEqual(orderRequestFingerprint(other), fingerprint);
});
