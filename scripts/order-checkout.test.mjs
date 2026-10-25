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
      update(patch) {
        state.patch = patch;
        return chain(state);
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
      if (table !== "products") throw new Error(`unexpected table ${table}`);
      return chain({ filters: [] });
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
