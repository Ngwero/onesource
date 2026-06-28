import i18n from "../i18n";
import type { Product } from "../types/product";
import type { Category } from "../types/product";
import type { HeroSlide } from "../types/hero";
import type { CreateOrderPayload, Order } from "../types/order";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export async function fetchProducts(params?: {
  category?: string;
  q?: string;
}): Promise<Product[]> {
  const search = new URLSearchParams();
  if (params?.category) search.set("category", params.category);
  if (params?.q) search.set("q", params.q);

  const qs = search.toString();
  const res = await fetch(`${API_BASE}/products${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(i18n.t("errors.loadProductsApi"));
  const data = await res.json();
  return data.products as Product[];
}

export async function fetchProductById(id: string): Promise<Product | undefined> {
  const res = await fetch(`${API_BASE}/products/${id}`);
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(i18n.t("errors.loadProduct"));
  const data = await res.json();
  return data.product as Product;
}

export async function fetchCategories(): Promise<Category[]> {
  let res = await fetch(`${API_BASE}/categories`);
  if (!res.ok) {
    res = await fetch(`${API_BASE}/products/categories`);
  }
  if (!res.ok) throw new Error(i18n.t("errors.loadCategories"));
  const data = await res.json();
  return data.categories as Category[];
}

export async function updateCategoryImage(
  categoryId: string,
  image: string
): Promise<Category> {
  const res = await fetch(`${API_BASE}/categories/${categoryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || i18n.t("errors.updateCategoryImage"));
  return data.category as Category;
}

export async function fetchHeroSlides(): Promise<HeroSlide[]> {
  const res = await fetch(`${API_BASE}/hero/slides`);
  if (!res.ok) throw new Error(i18n.t("errors.loadHeroSlides"));
  const data = await res.json();
  return (data.slides as HeroSlide[]) ?? [];
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || i18n.t("errors.placeOrderFailed"));
  return data.order as Order;
}

export async function fetchOrders(userId: string): Promise<Order[]> {
  const res = await fetch(`${API_BASE}/orders?userId=${encodeURIComponent(userId)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || i18n.t("errors.loadOrders"));
  return (data.orders as Order[]) ?? [];
}

export async function fetchOrderById(id: string, userId?: string): Promise<Order | undefined> {
  const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  const res = await fetch(`${API_BASE}/orders/${id}${qs}`);
  if (res.status === 404) return undefined;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || i18n.t("errors.loadOrder"));
  return data.order as Order;
}

export async function requestPasswordReset(
  email: string,
  redirectTo: string
): Promise<{ error: string | null }> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, redirectTo }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: (data.error as string) || i18n.t("errors.passwordResetFailed") };
    }
    return { error: null };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return { error: i18n.t("errors.passwordResetTimeout") };
    }
    return {
      error: e instanceof Error ? e.message : i18n.t("errors.passwordResetFailed"),
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

export type LoginVerifyResult = { error: string | null; verified?: boolean };

export async function requestLoginOtp(
  email: string,
  password: string
): Promise<LoginVerifyResult> {
  const res = await fetch(`${API_BASE}/auth/login/request-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: (data.error as string) || i18n.t("errors.signInFailed") };
  }
  return { error: null, verified: Boolean(data.verified) };
}

export async function sendWelcomeEmail(accessToken: string): Promise<void> {
  await fetch(`${API_BASE}/auth/welcome`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
