import assert from "node:assert/strict";
import { test } from "node:test";
import { priceOrderFromCatalogue } from "../server/lib/orderPricing.js";

test("active deal price is what checkout charges", () => {
  const lines = [{ productId: "oil-1", quantity: 2 }];
  const products = [
    {
      id: "oil-1",
      title: "Cooking oil",
      price: 20000,
      in_stock: true,
      stock_quantity: 10,
      published: true,
    },
  ];
  const deals = new Map([["oil-1", 12000]]);
  const priced = priceOrderFromCatalogue(lines, products, { dealPriceByProductId: deals });
  assert.equal(priced.items[0].unit_price, 12000);
  assert.equal(priced.items[0].line_total, 24000);
  assert.equal(priced.subtotal, 24000);
});

test("deal above catalogue price is ignored", () => {
  const priced = priceOrderFromCatalogue(
    [{ productId: "oil-1", quantity: 1 }],
    [{ id: "oil-1", title: "Oil", price: 10000, in_stock: true, stock_quantity: 5, published: true }],
    { dealPriceByProductId: new Map([["oil-1", 15000]]) }
  );
  assert.equal(priced.items[0].unit_price, 10000);
});
