import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { Product } from "../types/product";
import { fetchProductById } from "../api/client";
import { useProducts } from "./ProductsContext";

export type CartItem = {
  product: Product;
  quantity: number;
};

export type LastAddedToBasket = {
  product: Product;
  quantityAdded: number;
};

type CartLine = {
  productId: string;
  quantity: number;
};

type CartContextType = {
  items: CartItem[];
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

export const GUEST_CART_STORAGE_KEY = "onesource-guest-cart-v1";

function readStoredCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => {
        const record = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
        const productId = String(record.productId ?? "").trim();
        const quantity = Math.floor(Number(record.quantity));
        if (!productId || !Number.isFinite(quantity) || quantity < 1) return null;
        return { productId, quantity };
      })
      .filter((line): line is CartLine => line != null);
  } catch {
    return [];
  }
}

function writeStoredCart(lines: CartLine[]) {
  try {
    localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Private mode / quota — keep the in-memory basket.
  }
}

function capQuantity(product: Product, quantity: number) {
  const cap = product.stockQuantity ?? 99;
  return Math.max(0, Math.min(quantity, cap));
}

function linesToItems(lines: CartLine[], resolve: (id: string) => Product | undefined) {
  const items: CartItem[] = [];
  for (const line of lines) {
    const product = resolve(line.productId);
    if (!product) continue;
    const quantity = capQuantity(product, line.quantity);
    if (quantity < 1 || !product.inStock) continue;
    items.push({ product, quantity });
  }
  return items;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { products } = useProducts();
  const [items, setItems] = useState<CartItem[]>([]);
  const [basketOpen, setBasketOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<LastAddedToBasket | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);
  const pendingLines = useRef<CartLine[] | null>(null);

  const markHydrated = (next: CartItem[]) => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    setItems(next);
    setHydrated(true);
  };

  useEffect(() => {
    const lines = readStoredCart();
    pendingLines.current = lines;
    if (!lines.length) {
      hydratedRef.current = true;
      setHydrated(true);
      return;
    }
    let cancelled = false;
    Promise.all(lines.map((line) => fetchProductById(line.productId).catch(() => undefined)))
      .then((fetched) => {
        if (cancelled || hydratedRef.current) return;
        const byId = new Map(fetched.filter(Boolean).map((product) => [product!.id, product!]));
        markHydrated(linesToItems(lines, (id) => byId.get(id)));
      })
      .catch(() => {
        if (!cancelled && !hydratedRef.current) {
          hydratedRef.current = true;
          setHydrated(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (hydrated) return;
    const lines = pendingLines.current;
    if (!lines?.length || !products.length) return;
    const byId = new Map(products.map((product) => [product.id, product]));
    const restored = linesToItems(lines, (id) => byId.get(id));
    if (restored.length === lines.length) {
      markHydrated(restored);
    }
  }, [products, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    writeStoredCart(
      items.map((item) => ({ productId: item.product.id, quantity: item.quantity }))
    );
  }, [items, hydrated]);

  const openBasket = useCallback(() => setBasketOpen(true), []);
  const closeBasket = useCallback(() => {
    setBasketOpen(false);
    setLastAdded(null);
  }, []);

  const maxForProduct = (product: Product, current = 0) => {
    const cap = product.stockQuantity ?? 99;
    return Math.max(0, Math.min(cap, cap - current));
  };

  const addToCart = useCallback((
    product: Product,
    quantity = 1,
    options: { openBasket?: boolean } = {}
  ) => {
    if (!product.inStock) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      const current = existing?.quantity ?? 0;
      const add = Math.min(quantity, maxForProduct(product, current));
      if (add < 1) return prev;
      setLastAdded({ product, quantityAdded: add });
      if (options.openBasket !== false) setBasketOpen(true);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, product, quantity: i.quantity + add }
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
        return { ...i, quantity: capQuantity(i.product, quantity) };
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
