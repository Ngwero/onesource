/**
 * Ensure 20 lamb products each have a real Unsplash product photo.
 *
 *   cd server && npm run seed:lamb
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { productMatchesSearch } from "../lib/productSearchMatch.js";
import { LAMB_PRODUCTS, lambImage } from "../data/lambCatalog.js";

function randomPrice(base = 12000) {
  return Math.round((base + Math.floor(Math.random() * 35000)) / 100) * 100;
}

async function main() {
  const db = requireSupabase();
  const { data: existing, error: fetchError } = await db
    .from("products")
    .select("id, title, price, original_price, rating, review_count, category, unit, prime, description, in_stock, stock_quantity, delivery");

  if (fetchError) {
    console.error(fetchError.message);
    process.exit(1);
  }

  const byId = new Map((existing ?? []).map((p) => [p.id, p]));
  const rows = [];
  let updated = 0;

  for (let i = 0; i < LAMB_PRODUCTS.length; i++) {
    const item = LAMB_PRODUCTS[i];
    const image = lambImage(item.photoId);
    const prev = byId.get(item.id);
    const title = `${item.name} – One Source`;
    const price = prev?.price ?? randomPrice(10000 + i * 800);

    rows.push(
      seedRowFromJson({
        id: item.id,
        title: prev?.title ?? title,
        price,
        originalPrice:
          prev?.original_price != null ? Number(prev.original_price) : undefined,
        rating: prev?.rating != null ? Number(prev.rating) : Number((4.2 + Math.random() * 0.75).toFixed(1)),
        reviewCount:
          prev?.review_count != null
            ? Number(prev.review_count)
            : Math.floor(100 + Math.random() * 2000),
        image,
        category: prev?.category ?? "livestock-products",
        unit: prev?.unit ?? item.unit,
        prime: prev?.prime ?? Math.random() > 0.35,
        description:
          prev?.description ??
          `${item.name}. Premium lamb from Ugandan farms. Halal-friendly cuts available on request.`,
        inStock: prev ? Boolean(prev.in_stock) : true,
        stockQuantity:
          prev?.stock_quantity != null
            ? Number(prev.stock_quantity)
            : 20 + Math.floor(Math.random() * 80),
        delivery:
          prev?.delivery ?? "FREE same-day delivery on orders over USh 100,000",
      })
    );

    if (prev && prev.image !== image) updated += 1;
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Upsert failed:", error.message);
    process.exit(1);
  }

  const lambCount = (existing ?? []).filter((p) =>
    productMatchesSearch(
      { title: p.title, description: p.description ?? "" },
      "lamb"
    )
  ).length;

  console.log(`Lamb photos: ${LAMB_PRODUCTS.length} products upserted with Unsplash images.`);
  console.log(`Updated images on ${updated || LAMB_PRODUCTS.length} existing rows.`);
  console.log(`Search "lamb" matches ~${lambCount} products.`);
  for (const item of LAMB_PRODUCTS) {
    console.log(`  • ${item.id} — ${item.name}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
