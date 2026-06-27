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
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  /** Shop-by-category banner (from admin / Supabase categories table) */
  image?: string;
};
