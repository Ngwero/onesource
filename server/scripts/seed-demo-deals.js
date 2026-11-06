/**
 * Seed at most 1–2 demo timed deals against real catalogue SKUs.
 * Does NOT mass-update production prices.
 *
 * Usage: node server/scripts/seed-demo-deals.js
 * Requires deals table (server/supabase/deals.sql) and Supabase env.
 *
 * Before DB writes in production, owner should backup under ~/onesource-details/backups/.
 */
import { requireSupabase } from "../lib/supabase.js";

const db = requireSupabase();

async function pickProducts(limit = 2) {
  const { data, error } = await db
    .from("products")
    .select("id, title, price")
    .eq("published", true)
    .eq("in_stock", true)
    .gt("stock_quantity", 0)
    .not("id", "like", "kitchen-%")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw error;
  return (data ?? [])
    .filter((p) => Number(p.price) > 2000)
    .slice(0, limit);
}

async function main() {
  const products = await pickProducts(2);
  if (!products.length) {
    console.error("No suitable products found for demo deals.");
    process.exit(1);
  }

  const starts = new Date(Date.now() - 3600_000).toISOString();
  const ends = new Date(Date.now() + 23 * 3600_000).toISOString();

  // Clear only our demo-tagged deals
  await db.from("deals").delete().ilike("title", "Demo:%");

  const rows = products.map((p, i) => {
    const catalogue = Math.floor(Number(p.price));
    const dealPrice = Math.max(1000, Math.floor(catalogue * 0.85));
    return {
      product_id: p.id,
      title: `Demo: ${i === 0 ? "Deal of the Day" : "Timed deal"} — ${p.title}`.slice(0, 180),
      deal_price: dealPrice,
      starts_at: starts,
      ends_at: ends,
      deal_of_day: i === 0,
      member_only: false,
      active: true,
    };
  });

  const { data, error } = await db.from("deals").insert(rows).select("id, product_id, deal_price, title");
  if (error) {
    console.error(error.message);
    console.error("Did you run server/supabase/deals.sql?");
    process.exit(1);
  }
  console.log("Seeded demo deals:", data);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
