import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Product } from "../types/product";

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
  addToCart: (product: Product, quantity?: number) => void;
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
  const [items, setItems] = useState<CartItem[]>([]);
  const [basketOpen, setBasketOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<LastAddedToBasket | null>(null);

  const openBasket = useCallback(() => setBasketOpen(true), []);
  const closeBasket = useCallback(() => {
    setBasketOpen(false);
    setLastAdded(null);
  }, []);

  const maxForProduct = (product: Product, current = 0) => {
    const cap = product.stockQuantity ?? 99;
    return Math.max(0, Math.min(cap, cap - current));
  };

  const addToCart = useCallback((product: Product, quantity = 1) => {
    if (!product.inStock) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      const current = existing?.quantity ?? 0;
      const add = Math.min(quantity, maxForProduct(product, current));
      if (add < 1) return prev;
      setLastAdded({ product, quantityAdded: add });
      setBasketOpen(true);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + add }
            : i
        );
      }
      return [...prev, { product, quantity: add }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity < 1) {
      setItems((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.product.id !== productId) return i;
        const cap = i.product.stockQuantity ?? 99;
        return { ...i, quantity: Math.min(quantity, cap) };
      })
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
        basketOpen,
        lastAdded,
        openBasket,
        closeBasket,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
