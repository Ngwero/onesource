import {
  categories,
  normalizeCategoryId,
  getCategoryById,
} from "./data/categories.js";

export { categories, normalizeCategoryId, getCategoryById };

export function rowToProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    price: Number(row.price),
    originalPrice: row.original_price != null ? Number(row.original_price) : undefined,
    rating: Number(row.rating),
    reviewCount: row.review_count,
    image: row.image,
    category: row.category,
    unit: row.unit,
    prime: Boolean(row.prime),
    description: row.description,
    inStock: Boolean(row.in_stock) && row.stock_quantity > 0,
    stockQuantity: row.stock_quantity,
    delivery: row.delivery,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function parseBody(body, { id } = {}) {
  const stockQty = Number(body.stockQuantity ?? body.stock_quantity ?? 0);
  const inStock =
    stockQty > 0 && body.inStock !== false && body.in_stock !== false;

  return {
    id: id ?? body.id,
    title: String(body.title ?? "").trim(),
    price: Number(body.price),
    original_price:
      body.originalPrice != null
        ? Number(body.originalPrice)
        : body.original_price != null
          ? Number(body.original_price)
          : null,
    rating: Number(body.rating ?? 4.5),
    review_count: Number(body.reviewCount ?? body.review_count ?? 0),
    image: String(body.image ?? "").trim(),
    category: normalizeCategoryId(String(body.category ?? "").trim()),
    unit: String(body.unit ?? "each").trim(),
    prime: Boolean(body.prime),
    description: String(body.description ?? "").trim(),
    in_stock: inStock,
    stock_quantity: Math.max(0, Math.floor(stockQty)),
    delivery: String(
      body.delivery ?? "FREE same-day delivery Tomorrow"
    ).trim(),
  };
}

export function seedRowFromJson(p) {
  return {
    id: p.id,
    title: p.title,
    price: p.price,
    original_price: p.originalPrice ?? null,
    rating: p.rating,
    review_count: p.reviewCount,
    image: p.image,
    category: p.category,
    unit: p.unit,
    prime: p.prime ?? true,
    description: p.description,
    in_stock: p.inStock !== false,
    stock_quantity: p.stockQuantity ?? 100,
    delivery: p.delivery,
  };
}

export function validateProduct(data, isUpdate = false) {
  const errors = [];
  if (!isUpdate && !data.id) errors.push("id is required");
  if (!data.title) errors.push("title is required");
  if (Number.isNaN(data.price) || data.price < 0)
    errors.push("valid price is required");
  if (!data.image) errors.push("image URL is required");
  if (!data.category) errors.push("category is required");
  const normalizedCategory = normalizeCategoryId(data.category);
  if (!getCategoryById(normalizedCategory))
    errors.push("invalid category");
  if (!data.description) errors.push("description is required");
  if (Number.isNaN(data.stock_quantity) || data.stock_quantity < 0)
    errors.push("valid stock quantity is required");
  return errors;
}
