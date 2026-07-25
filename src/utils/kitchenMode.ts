import {
  aisleIdFromProductId,
  KITCHEN_WARE_AISLES,
  KITCHEN_WARE_CATEGORY_ID,
  type KitchenAisleId,
} from "../data/kitchenWare";
import { productMatchesCategory } from "../data/categories";
import type { Product } from "../types/product";

export function isKitchenPath(pathname: string): boolean {
  if (pathname === "/kitchen" || pathname.startsWith("/kitchen/")) return true;
  if (pathname.includes("kitchen-ware")) return true;
  // Kitchen PDP keeps kitchen chrome (SKU ids are kitchen-{aisle}-…)
  return /^\/product\/kitchen-/.test(pathname);
}

export function isKitchenProduct(product: Product | null | undefined): boolean {
  if (!product) return false;
  return productMatchesCategory(product.category, KITCHEN_WARE_CATEGORY_ID);
}

export function kitchenAislePath(aisleId: string): string {
  return `/kitchen/aisle/${aisleId}`;
}

export function groupKitchenByAisle(products: Product[]) {
  const groups = new Map<string, Product[]>();
  for (const aisle of KITCHEN_WARE_AISLES) groups.set(aisle.id, []);

  for (const product of products) {
    const id = aisleIdFromProductId(product.id);
    if (!id) continue;
    const list = groups.get(id) ?? [];
    list.push(product);
    groups.set(id, list);
  }

  return KITCHEN_WARE_AISLES.map((aisle) => ({
    ...aisle,
    products: groups.get(aisle.id) ?? [],
  }));
}

export function filterKitchenProducts(products: Product[]): Product[] {
  return products.filter((product) =>
    productMatchesCategory(product.category, KITCHEN_WARE_CATEGORY_ID)
  );
}

export function filterKitchenAisle(
  products: Product[],
  aisleId: KitchenAisleId | string
): Product[] {
  return products.filter(
    (product) => aisleIdFromProductId(product.id) === aisleId
  );
}

export function isValidKitchenAisleId(id: string | undefined | null): id is KitchenAisleId {
  if (!id) return false;
  return KITCHEN_WARE_AISLES.some((a) => a.id === id);
}
