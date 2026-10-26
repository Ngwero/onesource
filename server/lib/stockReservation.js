/**
 * Reserve catalogue stock so two checkouts cannot both take the last unit.
 * Prefers the optional `reserve_product_stock` RPC (one transaction). If that
 * function is not installed, uses an optimistic `stock_quantity = current`
 * update that still fails the loser when two requests race.
 */

function isMissingRpc(error) {
  const code = String(error?.code ?? "");
  const msg = String(error?.message ?? error ?? "").toLowerCase();
  return (
    code === "PGRST202" ||
    code === "42883" ||
    msg.includes("could not find the function") ||
    (msg.includes("reserve_product_stock") &&
      (msg.includes("does not exist") || msg.includes("schema cache")))
  );
}

function rpcItems(items) {
  return items.map((item) => ({
    product_id: item.product_id,
    quantity: item.quantity,
  }));
}

async function reserveViaRpc(db, items) {
  const { data, error } = await db.rpc("reserve_product_stock", {
    p_items: rpcItems(items),
  });
  if (error) return { error };
  const failed = Array.isArray(data)
    ? data.find((row) => row && row.ok === false)
    : data?.ok === false
      ? data
      : null;
  if (failed) {
    return {
      ok: false,
      error: `Not enough stock for ${failed.product_id || "item"}`,
      productId: failed.product_id,
    };
  }
  return {
    ok: true,
    reserved: items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
    })),
    via: "rpc",
  };
}

async function releaseViaRpc(db, reserved) {
  const { error } = await db.rpc("release_product_stock", {
    p_items: rpcItems(reserved),
  });
  if (error && !isMissingRpc(error)) throw error;
  return !error;
}

async function reserveOneOptimistic(db, item, attempts = 8) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const { data: row, error } = await db
      .from("products")
      .select("id, stock_quantity, in_stock")
      .eq("id", item.product_id)
      .maybeSingle();
    if (error) throw error;
    const current = Math.floor(Number(row?.stock_quantity ?? 0));
    if (!row || row.in_stock === false || current < item.quantity) {
      return { ok: false, error: `Not enough stock for ${item.product_id}` };
    }
    const next = current - item.quantity;
    const { data: updated, error: updateError } = await db
      .from("products")
      .update({
        stock_quantity: next,
        in_stock: next > 0,
      })
      .eq("id", item.product_id)
      .eq("stock_quantity", current)
      .eq("in_stock", true)
      .gte("stock_quantity", item.quantity)
      .select("id, stock_quantity")
      .maybeSingle();
    if (updateError) throw updateError;
    if (updated) return { ok: true, previous: current };
  }
  return { ok: false, error: `Could not reserve stock for ${item.product_id}` };
}

async function reserveOptimistic(db, items) {
  const reserved = [];
  try {
    for (const item of items) {
      const result = await reserveOneOptimistic(db, item);
      if (!result.ok) {
        throw Object.assign(new Error(result.error), { stockFailure: true, productId: item.product_id });
      }
      reserved.push({
        product_id: item.product_id,
        quantity: item.quantity,
        previous: result.previous,
      });
    }
    return { ok: true, reserved, via: "optimistic" };
  } catch (error) {
    await releaseOptimistic(db, reserved);
    if (error.stockFailure) return { ok: false, error: error.message, productId: error.productId };
    throw error;
  }
}

async function releaseOptimistic(db, reserved) {
  for (const item of reserved) {
    let restored = false;
    for (let attempt = 0; attempt < 8; attempt++) {
      const { data: row, error } = await db.from("products")
        .select("stock_quantity,in_stock").eq("id", item.product_id).maybeSingle();
      if (error) throw error;
      if (!row) throw new Error(`Cannot restore stock for ${item.product_id}`);
      const current = Number(row.stock_quantity);
      const { data, error: updateError } = await db.from("products")
        .update({ stock_quantity: current + item.quantity, in_stock: current === 0 || row.in_stock })
        .eq("id", item.product_id).eq("stock_quantity", current)
        .select("id").maybeSingle();
      if (updateError) throw updateError;
      if (data) { restored = true; break; }
    }
    if (!restored) throw new Error(`Could not restore stock for ${item.product_id}`);
  }
}

export async function reserveStock(db, items) {
  if (!items?.length) return { ok: true, reserved: [], via: "none" };

  items = [...items].sort((a, b) => a.product_id.localeCompare(b.product_id));
  const rpc = await reserveViaRpc(db, items);
  if (typeof rpc.ok === "boolean") return rpc;
  if (!isMissingRpc(rpc.error)) {
    const msg = String(rpc.error.message ?? "");
    const stockMatch = msg.match(/insufficient_stock:(\S+)/);
    if (stockMatch) {
      return {
        ok: false,
        error: `Not enough stock for ${stockMatch[1]}`,
        productId: stockMatch[1],
      };
    }
    throw rpc.error;
  }
  return reserveOptimistic(db, items);
}

export async function releaseStock(db, reserved, { via } = {}) {
  if (!reserved?.length) return;
  if (via === "rpc") {
    const released = await releaseViaRpc(db, reserved);
    if (released) return;
  }
  await releaseOptimistic(db, reserved);
}
