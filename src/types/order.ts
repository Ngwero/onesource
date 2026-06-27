export type OrderItem = {
  id: string;
  product_id: string;
  product_title: string;
  product_image: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type Order = {
  id: string;
  status: string;
  email: string;
  full_name: string;
  phone?: string | null;
  address_line1?: string;
  address_line2?: string | null;
  city: string;
  district?: string | null;
  notes?: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  currency: string;
  created_at: string;
  order_items?: OrderItem[];
};

export type CreateOrderPayload = {
  userId?: string;
  email: string;
  fullName: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district?: string;
  notes?: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: {
    productId: string;
    title: string;
    image?: string;
    unitPrice: number;
    quantity: number;
  }[];
};
