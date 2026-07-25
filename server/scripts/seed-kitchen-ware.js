/**
 * Seed Kitchen Ware products and category.
 *
 *   cd server && npm run seed:kitchen-ware
 *   cd server && npm run seed:kitchen-ware -- --with-images
 */
import sharp from "sharp";
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import {
  KITCHEN_WARE_AISLES,
  KITCHEN_WARE_CATEGORY_ID,
  KITCHEN_WARE_PRODUCTS,
} from "../data/kitchenWareCatalog.js";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "images";
const withImages = process.argv.includes("--with-images");

const aisleTitleById = Object.fromEntries(
  KITCHEN_WARE_AISLES.map((aisle) => [aisle.id, aisle.title])
);

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function createAndUploadImage(db, item) {
  const aisleTitle = aisleTitleById[item.aisleId] || "Kitchen Ware";
  const lines = item.name.split(" ");
  const line1 = escapeXml(lines.slice(0, 3).join(" "));
  const line2 = escapeXml(lines.slice(3).join(" "));
  const svg = `
    <svg width="480" height="640" viewBox="0 0 480 640" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f7f3ec"/>
          <stop offset="1" stop-color="#ebe4d8"/>
        </linearGradient>
      </defs>
      <rect width="480" height="640" fill="url(#bg)"/>
      <rect x="48" y="88" width="384" height="420" rx="28" fill="#fff" stroke="${item.color}" stroke-width="3"/>
      <rect x="90" y="140" width="300" height="180" rx="18" fill="${item.color}" opacity=".18"/>
      <rect x="140" y="175" width="200" height="28" rx="8" fill="${item.color}"/>
      <rect x="120" y="230" width="240" height="14" rx="7" fill="${item.color}" opacity=".55"/>
      <rect x="150" y="260" width="180" height="14" rx="7" fill="${item.color}" opacity=".35"/>
      <text x="240" y="380" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="700" letter-spacing="2" fill="${item.color}">ONE SOURCE</text>
      <text x="240" y="420" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="800" fill="#1c1c1c">${line1}</text>
      ${line2 ? `<text x="240" y="452" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="800" fill="#1c1c1c">${line2}</text>` : ""}
      <text x="240" y="500" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="600" fill="#5c5c58">${escapeXml(aisleTitle)}</text>
      <text x="240" y="590" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#2e5e4a">Kitchen Ware</text>
    </svg>`;

  const image = await sharp(Buffer.from(svg)).webp({ quality: 84 }).toBuffer();
  const objectPath = `products/kitchen-ware/${item.id}.webp`;
  const { error } = await db.storage.from(BUCKET).upload(objectPath, image, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw error;
  return db.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
}

async function main() {
  const db = requireSupabase();

  const { error: categoryError } = await db.from("categories").upsert(
    {
      id: KITCHEN_WARE_CATEGORY_ID,
      name: "Kitchen Ware",
      icon: "🍳",
      category_group: "specialty",
      sort_order: 14,
      active: true,
    },
    { onConflict: "id" }
  );
  if (categoryError) throw categoryError;

  await db
    .from("categories")
    .update({ active: false })
    .eq("id", "kitchen-furniture");

  const ids = KITCHEN_WARE_PRODUCTS.map((item) => item.id);
  const { data: existing, error: existingError } = await db
    .from("products")
    .select("id, image")
    .in("id", ids);
  if (existingError) throw existingError;
  const existingImages = new Map(
    (existing ?? []).map((row) => [row.id, row.image])
  );

  const rows = [];
  for (let index = 0; index < KITCHEN_WARE_PRODUCTS.length; index += 1) {
    const item = KITCHEN_WARE_PRODUCTS[index];
    const image =
      !withImages && existingImages.get(item.id)
        ? existingImages.get(item.id)
        : await createAndUploadImage(db, item);

    rows.push(
      seedRowFromJson({
        id: item.id,
        title: `${item.name} – One Source`,
        price: item.price,
        originalPrice: index % 3 === 0 ? Math.round(item.price * 1.1) : undefined,
        rating: Number((4.3 + (index % 5) * 0.1).toFixed(1)),
        reviewCount: 40 + index * 17,
        image,
        category: KITCHEN_WARE_CATEGORY_ID,
        unit: item.unit,
        prime: true,
        description: item.description,
        inStock: true,
        stockQuantity: 25 + index * 3,
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) throw error;

  // Only remove old short-suffix placeholder SKUs (e.g. kitchen-cookware-01).
  // Never delete IKEA imports (kitchen-{aisle}-{articleId} with 6+ digit ids).
  const { data: legacy } = await db
    .from("products")
    .select("id")
    .eq("category", KITCHEN_WARE_CATEGORY_ID);
  const keep = new Set(ids);
  const toDelete = (legacy ?? [])
    .map((row) => row.id)
    .filter((id) => !keep.has(id))
    .filter((id) => /^kitchen-[a-z0-9-]+-\d{1,3}$/i.test(id));
  if (toDelete.length) {
    await db.from("products").delete().in("id", toDelete);
  }

  await db
    .from("products")
    .update({ category: KITCHEN_WARE_CATEGORY_ID })
    .eq("category", "kitchen-furniture");

  console.log(`Seeded ${rows.length} products in ${KITCHEN_WARE_CATEGORY_ID}:`);
  for (const aisle of KITCHEN_WARE_AISLES) {
    const count = KITCHEN_WARE_PRODUCTS.filter((p) => p.aisleId === aisle.id).length;
    console.log(`  • ${aisle.title} (${count})`);
  }
  if (toDelete.length) console.log(`Removed ${toDelete.length} old kitchen SKUs.`);
}

main().catch((error) => {
  console.error("Kitchen ware seed failed:", error.message);
  process.exit(1);
});
