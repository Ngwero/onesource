import i18n from "../i18n";
import type { Product } from "../types/product";
import type { Category } from "../types/product";
import type { HeroSlide } from "../types/hero";
import type { KitchenCollage } from "../types/kitchenCollage";
import type { CreateOrderPayload, Order } from "../types/order";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

function isKitchenSku(p: Product): boolean {
  return p.id.startsWith("kitchen-") || p.category === "kitchen-ware";
}

async function fetchProductsPageRaw(
  search: URLSearchParams,
  page: number
): Promise<{ products: Product[]; total: number }> {
  search.set("page", String(page));
  const res = await fetch(`${API_BASE}/products?${search.toString()}`);
  if (!res.ok) throw new Error(i18n.t("errors.loadProductsApi"));
  const data = await res.json();
  return {
    products: (data.products as Product[]) ?? [],
    total: typeof data.total === "number" ? data.total : 0,
  };
}

/** When API ignores shop=fresh, binary-search the first page that has produce. */
async function findLegacyFreshStartPage(
  search: URLSearchParams,
  pageSize: number,
  catalogTotal: number
): Promise<number> {
  const last = catalogTotal <= 0 ? 0 : Math.floor((catalogTotal - 1) / pageSize);
  let lo = 0;
  let hi = last;
  let answer = last;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const { products } = await fetchProductsPageRaw(search, mid);
    if (products.some((p) => !isKitchenSku(p))) {
      answer = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return answer;
}

export async function fetchProducts(params?: {
  category?: string;
  q?: string;
  shop?: "fresh" | "kitchen";
}): Promise<Product[]> {
  const shop = params?.shop ?? "fresh";
  const search = new URLSearchParams();
  if (params?.category) search.set("category", params.category);
  if (params?.q) search.set("q", params.q);
  search.set("shop", shop);
  const pageSize = 1000;
  search.set("pageSize", String(pageSize));

  const first = await fetchProductsPageRaw(search, 0);
  let startPage = 0;

  if (shop === "fresh" && !params?.category && !params?.q) {
    const produceOnFirst = first.products.filter((p) => !isKitchenSku(p));
    if (first.products.length > 0 && produceOnFirst.length === 0) {
      startPage = await findLegacyFreshStartPage(search, pageSize, first.total);
    }
  }

  const products: Product[] = [];
  let page = startPage;
  let total = first.total || Infinity;
  const maxPages = 50;

  while (products.length < total && page - startPage < maxPages) {
    const batch =
      page === 0 && startPage === 0
        ? first.products
        : (await fetchProductsPageRaw(search, page)).products;

    if (shop === "fresh") {
      const fresh = batch.filter((p) => !isKitchenSku(p));
      products.push(...fresh);
      // Old API: once we leave the kitchen block, empty fresh page means done.
      if (startPage > 0 && fresh.length === 0) break;
    } else if (shop === "kitchen") {
      const kitchen = batch.filter(isKitchenSku);
      products.push(...kitchen);
      if (kitchen.length === 0) break;
    } else {
      products.push(...batch);
    }

    if (batch.length === 0) break;
    page += 1;
    if (startPage > 0) {
      total = Math.max(0, first.total - startPage * pageSize);
    }
  }

  return products;
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

export async function fetchHeroSlides(
  placement: "home" | "exports" | "kitchen" | "onboarding" = "home"
): Promise<HeroSlide[]> {
  const res = await fetch(`${API_BASE}/hero/slides?placement=${placement}`);
  if (!res.ok) throw new Error(i18n.t("errors.loadHeroSlides"));
  const data = await res.json();
  return (data.slides as HeroSlide[]) ?? [];
}

export async function fetchKitchenCollage(): Promise<KitchenCollage> {
  const res = await fetch(`${API_BASE}/kitchen/collage`);
  if (!res.ok) throw new Error(i18n.t("errors.loadKitchenCollage"));
  const data = await res.json();
  return data.collage as KitchenCollage;
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
): Promise<{ error: string | null; sent?: boolean }> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 45_000);

  try {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, redirectTo }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 404) {
      return { error: (data.error as string) || i18n.t("errors.emailNotRegistered") };
    }
    if (!res.ok) {
      return { error: (data.error as string) || i18n.t("errors.passwordResetFailed") };
    }
    return { error: null, sent: Boolean(data.sent) };
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

export type LoginVerifyResult = {
  error: string | null;
  verified?: boolean;
  accessToken?: string;
  refreshToken?: string;
};

export async function requestLoginOtp(
  email: string,
  password: string
): Promise<LoginVerifyResult> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 45_000);

  try {
    const res = await fetch(`${API_BASE}/auth/login/request-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: (data.error as string) || i18n.t("errors.signInFailed") };
    }
    return { error: null, verified: Boolean(data.verified) };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return { error: i18n.t("errors.signInTimeout") };
    }
    return {
      error: e instanceof Error ? e.message : i18n.t("errors.signInFailed"),
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function verifyLoginOtp(
  email: string,
  otp: string
): Promise<LoginVerifyResult> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(`${API_BASE}/auth/login/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: (data.error as string) || i18n.t("errors.otpInvalid") };
    }
    return {
      error: null,
      accessToken: data.accessToken as string,
      refreshToken: data.refreshToken as string,
    };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return { error: i18n.t("errors.signInTimeout") };
    }
    return {
      error: e instanceof Error ? e.message : i18n.t("errors.otpInvalid"),
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function sendWelcomeEmail(accessToken: string): Promise<void> {
  await fetch(`${API_BASE}/auth/welcome`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export type SignUpResult = {
  error: string | null;
  accessToken?: string;
  refreshToken?: string;
  needsSignIn?: boolean;
};

/** Create account via API (Admin + Brevo) — same mail path as login OTP. */
export async function signUpAccount(
  email: string,
  password: string,
  fullName: string
): Promise<SignUpResult> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 45_000);

  try {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        fullName: fullName.trim(),
      }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: (data.error as string) || i18n.t("errors.signUpFailed") };
    }
    return {
      error: null,
      accessToken: data.accessToken as string | undefined,
      refreshToken: data.refreshToken as string | undefined,
      needsSignIn: Boolean(data.needsSignIn),
    };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return { error: i18n.t("errors.signUpFailed") };
    }
    return {
      error: e instanceof Error ? e.message : i18n.t("errors.signUpFailed"),
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
