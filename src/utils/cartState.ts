import type { Product } from '../types/product';

export const GUEST_CART_STORAGE_KEY = 'onesource-guest-cart-v1';
export type CartLine = { productId: string; quantity: number };
export type CartState = {
  lines: CartLine[];
  products: Record<string, Product>;
  failed: string[];
  basketOpen: boolean;
  lastAdded: { product: Product; quantityAdded: number } | null;
};
export function readStoredCart(): CartLine[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(GUEST_CART_STORAGE_KEY) || '[]');
    if (!Array.isArray(value)) return [];
    const lines = new Map<string, number>();
    for (const row of value.slice(0, 100)) {
      if (typeof row?.productId !== 'string' || !Number.isSafeInteger(row.quantity) || row.quantity < 1) continue;
      lines.set(row.productId, Math.min(10000, (lines.get(row.productId) || 0) + row.quantity));
    }
    return [...lines].map(([productId, quantity]) => ({ productId, quantity }));
  } catch { return []; }
}
export function initialCart(): CartState {
  return { lines: readStoredCart(), products: {}, failed: [], basketOpen: false, lastAdded: null };
}
export type CartAction =
  | { type: 'add'; product: Product; quantity: number; open: boolean }
  | { type: 'quantity'; id: string; quantity: number }
  | { type: 'remove'; id: string }
  | { type: 'clear' | 'retry' | 'open' | 'close' }
  | { type: 'loaded'; results: { id: string; product?: Product; failed?: boolean }[] };
export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'loaded': {
      const products = { ...state.products };
      const missing = new Set<string>();
      const failed = new Set(state.failed);
      for (const result of action.results) {
        if (result.failed) failed.add(result.id);
        else if (result.product) products[result.id] = result.product;
        else missing.add(result.id);
      }
      return { ...state, products, failed: [...failed], lines: state.lines.filter(l => !missing.has(l.productId)) };
    }
    case 'add': {
      const { product } = action;
      if (!product.inStock || !Number.isSafeInteger(action.quantity) || action.quantity < 1) return state;
      const current = state.lines.find(l => l.productId === product.id)?.quantity || 0;
      const quantity = Math.min(action.quantity, Math.max(0, (product.stockQuantity ?? 99) - current));
      if (quantity < 1) return state;
      const line = { productId: product.id, quantity: current + quantity };
      return { ...state, products: { ...state.products, [product.id]: product },
        lines: current ? state.lines.map(l => l.productId === product.id ? line : l) : [...state.lines, line],
        basketOpen: action.open || state.basketOpen, lastAdded: { product, quantityAdded: quantity } };
    }
    case 'quantity':
      if (!Number.isSafeInteger(action.quantity)) return state;
      return { ...state, lines: state.lines.map(l => l.productId === action.id
        ? { ...l, quantity: Math.min(action.quantity, state.products[action.id]?.stockQuantity ?? 99) } : l).filter(l => l.quantity > 0) };
    case 'remove': return { ...state, lines: state.lines.filter(l => l.productId !== action.id) };
    case 'clear': return { ...state, lines: [], lastAdded: null };
    case 'retry': return { ...state, failed: [] };
    case 'open': return { ...state, basketOpen: true };
    case 'close': return { ...state, basketOpen: false, lastAdded: null };
  }
}
