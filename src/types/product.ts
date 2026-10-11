export type Product = {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  image: string;
  category: string;
  unit: string;
  prime: boolean;
  description: string;
  inStock: boolean;
  stockQuantity?: number;
  delivery: string;
  supplierId?: string;
  supplierName?: string;
  /** Structured product information (ingredients, allergens, warnings, specs). */
  details?: ProductInfo;
  /** False when hidden from the shop (admin only). */
  published?: boolean;
};

export type ProductSpec = { key: string; label: string; value: string };

export type ProductInfo = {
  source?: "manufacturer" | "listing" | string;
  brand?: string;
  form?: string;
  origin?: string;
  temperature?: string;
  ingredients?: string;
  allergens?: string[];
  allergenStatement?: string;
  howToUse?: string;
  storage?: string;
  care?: string;
  warnings?: string[];
  highlights?: string[];
  suitableFor?: string[];
  unit?: string;
  specs?: ProductSpec[];
  hiddenReason?: string[];
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  /** Shop-by-category banner (from admin / Supabase categories table) */
  image?: string;
};
