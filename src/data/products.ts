export type { Product } from "../types/product";
export { categories } from "./categories";

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(amount);
}
