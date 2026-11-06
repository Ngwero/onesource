/**
 * Rule-based recommendations from real order history.
 * Empty arrays when there is no co-occurrence / purchase history.
 */

/** "Customers also bought" from order-line co-occurrence. */
export async function alsoBoughtProductIds(db, productId, { limit = 12 } = {}) {
  try {
    const { data: lines, error } = await db
      .from("order_items")
      .select("order_id")
      .eq("product_id", productId)
      .limit(80);
    if (error) throw error;
    const orderIds = [...new Set((lines ?? []).map((row) => row.order_id).filter(Boolean))];
    if (!orderIds.length) return [];

    const { data: peers, error: peerErr } = await db
      .from("order_items")
      .select("product_id")
      .in("order_id", orderIds.slice(0, 40))
      .neq("product_id", productId)
      .limit(200);
    if (peerErr) throw peerErr;

    const counts = new Map();
    for (const row of peers ?? []) {
      const id = String(row.product_id);
      if (!id || id === productId) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit)
      .map(([id]) => id);
  } catch {
    return [];
  }
}

/**
 * "Buy it again" — distinct products from the signed-in user's delivered orders,
 * most recently purchased first.
 */
export async function buyAgainProductIds(db, userId, { limit = 16 } = {}) {
  if (!userId) return [];
  try {
    const { data: orders, error } = await db
      .from("orders")
      .select("id, created_at, order_items(product_id)")
      .eq("user_id", userId)
      .eq("status", "delivered")
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) throw error;

    const seen = new Set();
    const ids = [];
    for (const order of orders ?? []) {
      for (const item of order.order_items ?? []) {
        const id = String(item.product_id ?? "");
        if (!id || seen.has(id)) continue;
        seen.add(id);
        ids.push(id);
        if (ids.length >= limit) return ids;
      }
    }
    return ids;
  } catch {
    return [];
  }
}
