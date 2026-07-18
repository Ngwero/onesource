/**
 * Seed one listing for each requested drink.
 *
 *   cd server && npm run seed:drinks
 *   cd server && npm run seed:drinks -- --with-images
 */
import sharp from "sharp";
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import {
  DRINK_PRODUCTS,
  DRINKS_CATEGORY_ID,
} from "../data/drinksCatalog.js";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "images";
const withImages = process.argv.includes("--with-images");

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function createAndUploadImage(db, drink) {
  const name = escapeXml(drink.name);
  const svg = `
    <svg width="480" height="640" viewBox="0 0 480 640" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffffff"/>
          <stop offset="1" stop-color="#f4f1e9"/>
        </linearGradient>
        <linearGradient id="bottle" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="${drink.color}" stop-opacity=".82"/>
          <stop offset=".45" stop-color="${drink.color}"/>
          <stop offset=".72" stop-color="${drink.color}" stop-opacity=".92"/>
          <stop offset="1" stop-color="${drink.color}" stop-opacity=".68"/>
        </linearGradient>
        <filter id="shadow" x="-30%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="0" dy="18" stdDeviation="15" flood-opacity=".18"/>
        </filter>
      </defs>
      <rect width="480" height="640" fill="url(#bg)"/>
      <ellipse cx="240" cy="565" rx="105" ry="22" fill="#1c1c1c" opacity=".12"/>
      <g filter="url(#shadow)">
        <path d="M205 92h70v60c0 17 10 27 21 38 17 17 25 38 25 64v252c0 42-25 67-81 67s-81-25-81-67V254c0-26 8-47 25-64 11-11 21-21 21-38V92z" fill="url(#bottle)"/>
        <rect x="201" y="76" width="78" height="30" rx="8" fill="${drink.color}"/>
        <rect x="166" y="264" width="148" height="176" rx="18" fill="${drink.accent}" opacity=".96"/>
        <path d="M183 122c-8 42-7 326 2 392" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" opacity=".22"/>
      </g>
      <text x="240" y="326" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="700" letter-spacing="2" fill="${drink.color}">ONE SOURCE</text>
      <text x="240" y="362" text-anchor="middle" font-family="Arial,sans-serif" font-size="${drink.name.length > 15 ? 22 : 28}" font-weight="900" fill="${drink.color}">${name}</text>
      <text x="240" y="395" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" font-weight="700" fill="${drink.color}" opacity=".82">500 ML</text>
      <text x="240" y="612" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" font-weight="700" fill="#2e5e4a">Serve chilled</text>
    </svg>`;

  const image = await sharp(Buffer.from(svg)).webp({ quality: 84 }).toBuffer();
  const objectPath = `products/drinks/${drink.id}.webp`;
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

  // Drinks belong in the Exports storefront, not a standalone shop category.
  const { error: categoryError } = await db
    .from("categories")
    .delete()
    .eq("id", "drinks");
  if (categoryError) throw categoryError;

  const ids = DRINK_PRODUCTS.map((drink) => drink.id);
  const { data: existing, error: existingError } = await db
    .from("products")
    .select("id, image")
    .in("id", ids);
  if (existingError) throw existingError;
  const existingImages = new Map(
    (existing ?? []).map((row) => [row.id, row.image])
  );

  const rows = [];
  for (let index = 0; index < DRINK_PRODUCTS.length; index += 1) {
    const drink = DRINK_PRODUCTS[index];
    const image =
      !withImages && existingImages.get(drink.id)
        ? existingImages.get(drink.id)
        : await createAndUploadImage(db, drink);

    rows.push(
      seedRowFromJson({
        id: drink.id,
        title: `${drink.name} ${drink.unit} – One Source`,
        price: drink.price,
        originalPrice: index === 2 ? drink.price + 500 : undefined,
        rating: Number((4.3 + (index % 4) * 0.1).toFixed(1)),
        reviewCount: 120 + index * 47,
        image,
        category: DRINKS_CATEGORY_ID,
        unit: drink.unit,
        prime: true,
        description: drink.description,
        inStock: true,
        stockQuantity: 100 + index * 12,
        delivery: "Export documentation and airfreight support available",
      })
    );
  }

  const { error } = await db
    .from("products")
    .upsert(rows, { onConflict: "id" });
  if (error) throw error;

  console.log(`Seeded ${rows.length} products in ${DRINKS_CATEGORY_ID}:`);
  for (const drink of DRINK_PRODUCTS) console.log(`  • ${drink.name}`);
}

main().catch((error) => {
  console.error("Drink seed failed:", error.message);
  process.exit(1);
});
