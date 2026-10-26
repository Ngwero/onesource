import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Product } from "../types/product";
import { fetchProductById } from "../api/client";
import { cartReducer, initialCart, GUEST_CART_STORAGE_KEY } from "../utils/cartState";

export type CartItem = {
  product: Product;
  quantity: number;
};

export type LastAddedToBasket = {
  product: Product;
  quantityAdded: number;
};

type CartContextType = {
  items: CartItem[];
  restoring: boolean;
  restoreError: boolean;
  retryRestore: () => void;
  addToCart: (
    product: Product,
    quantity?: number,
    options?: { openBasket?: boolean }
  ) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  basketOpen: boolean;
  lastAdded: LastAddedToBasket | null;
  openBasket: () => void;
  closeBasket: () => void;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, initialCart);
  const unresolved = state.lines.filter(line => !state.products[line.productId]);
  const pendingIds = unresolved.filter(line => !state.failed.includes(line.productId)).map(line => line.productId).sort();
  const pendingKey = pendingIds.length ? JSON.stringify(pendingIds) : "";
  useEffect(() => {
    if (!pendingKey) return;
    let cancelled = false;
    Promise.all((JSON.parse(pendingKey) as string[]).map(async id => {
      try { return { id, product: await fetchProductById(id) }; }
      catch { return { id, failed: true }; }
    })).then(results => { if (!cancelled) dispatch({ type: 'loaded', results }); });
    return () => { cancelled = true; };
  }, [pendingKey]);
  useEffect(() => {
    try { localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(state.lines)); }
    catch { /* Keep the basket usable when storage is unavailable. */ }
  }, [state.lines]);
  const items: CartItem[] = state.lines.flatMap(line => {
    const product = state.products[line.productId];
    if (!product?.inStock) return [];
    const quantity = Math.min(line.quantity, product.stockQuantity ?? 99);
    return quantity > 0 ? [{ product, quantity }] : [];
  });
  const addToCart = useCallback((product: Product, quantity = 1, options: { openBasket?: boolean } = {}) => {
    dispatch({ type: 'add', product, quantity, open: options.openBasket !== false });
  }, []);
  const removeFromCart = useCallback((id: string) => dispatch({ type: 'remove', id }), []);
  const updateQuantity = useCallback((id: string, quantity: number) => dispatch({ type: 'quantity', id, quantity }), []);
  const clearCart = useCallback(() => dispatch({ type: 'clear' }), []);
  const openBasket = useCallback(() => dispatch({ type: 'open' }), []);
  const closeBasket = useCallback(() => dispatch({ type: 'close' }), []);
  const retryRestore = useCallback(() => dispatch({ type: 'retry' }), []);
  return <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart,
    openBasket, closeBasket, retryRestore, basketOpen: state.basketOpen, lastAdded: state.lastAdded,
    restoring: Boolean(pendingKey), restoreError: unresolved.some(line => state.failed.includes(line.productId)),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
  }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
