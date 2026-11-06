import assert from "node:assert/strict";
import { test } from "node:test";
import { isDealLive, rowToDeal } from "../server/lib/dealsService.js";

test("isDealLive uses UTC window inclusive start exclusive end", () => {
  const deal = {
    active: true,
    startsAt: "2026-11-06T08:00:00.000Z",
    endsAt: "2026-11-06T12:00:00.000Z",
  };
  assert.equal(isDealLive(deal, new Date("2026-11-06T07:59:59.000Z")), false);
  assert.equal(isDealLive(deal, new Date("2026-11-06T08:00:00.000Z")), true);
  assert.equal(isDealLive(deal, new Date("2026-11-06T11:59:59.000Z")), true);
  assert.equal(isDealLive(deal, new Date("2026-11-06T12:00:00.000Z")), false);
});

test("rowToDeal msRemaining follows server now not device clock", () => {
  const serverNow = new Date("2026-11-06T10:00:00.000Z");
  const deal = rowToDeal(
    {
      id: "1",
      product_id: "p1",
      title: "Demo",
      deal_price: 5000,
      starts_at: "2026-11-06T09:00:00.000Z",
      ends_at: "2026-11-06T11:00:00.000Z",
      deal_of_day: true,
      member_only: false,
      active: true,
    },
    serverNow
  );
  assert.equal(deal.live, true);
  assert.equal(deal.msRemaining, 3600_000);
  assert.equal(deal.serverNow, serverNow.toISOString());
});
