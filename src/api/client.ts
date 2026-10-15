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

function isCosmeticsSku(p: Product): boolean {
  return p.id.startsWith("cosmetics-") || p.category === "cosmetics";
}

function isFreshSku(p: Product): boolean {
  return !isKitchenSku(p) && !isCosmeticsSku(p);
}

/**
 * A cold API (Railway just woke, or Supabase cancelled the first statement) can
 * fail or sit much longer than the next call. Stay above that, then try once more.
 * A real outage still fails the second attempt.
 */
const CATALOG_ATTEMPT_MS = 45_000;
const CATALOG_RETRY_PAUSE_MS = 800;

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

async function fetchProductsPageRaw(
  search: URLSearchParams,
  page: number,
  signal?: AbortSignal
): Promise<{ products: Product[]; total: number }> {
  const query = new URLSearchParams(search);
  query.set("page", String(page));
  const res = await fetch(`${API_BASE}/products?${query.toString()}`, { signal });
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
  catalogTotal: number,
  signal?: AbortSignal
): Promise<number> {
  const last = catalogTotal <= 0 ? 0 : Math.floor((catalogTotal - 1) / pageSize);
  let lo = 0;
  let hi = last;
  let answer = last;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const { products } = await fetchProductsPageRaw(search, mid, signal);
    if (products.some(isFreshSku)) {
      answer = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return answer;
}

async function fetchProductsAttempt(
  params: {
    category?: string;
    q?: string;
    shop?: "fresh" | "kitchen" | "cosmetics";
  } | undefined,
  signal: AbortSignal
): Promise<Product[]> {
  const shop = params?.shop ?? "fresh";
  const search = new URLSearchParams();
  if (params?.category) search.set("category", params.category);
  if (params?.q) search.set("q", params.q);
  search.set("shop", shop);
  const pageSize = 1000;
  search.set("pageSize", String(pageSize));

  const first = await fetchProductsPageRaw(search, 0, signal);
  let startPage = 0;

  if (shop === "fresh" && !params?.category && !params?.q) {
    const produceOnFirst = first.products.filter(isFreshSku);
    if (first.products.length > 0 && produceOnFirst.length === 0) {
      startPage = await findLegacyFreshStartPage(search, pageSize, first.total, signal);
    }
  }

  const matchesShop =
    shop === "kitchen" ? isKitchenSku : shop === "cosmetics" ? isCosmeticsSku : isFreshSku;
  const serverFiltered =
    startPage === 0 && first.total > 0 && first.products.every(matchesShop);
  if (serverFiltered) {
    const pageCount = Math.min(Math.ceil(first.total / pageSize), 50);
    const pages: Product[][] = [first.products];
    const concurrency = 4;
    for (let from = 1; from < pageCount; from += concurrency) {
      const batch = await Promise.all(
        Array.from({ length: Math.min(concurrency, pageCount - from) }, (_, i) =>
          fetchProductsPageRaw(search, from + i, signal).then((r) => r.products.filter(matchesShop))
        )
      );
      pages.push(...batch);
    }
    return pages.flat();
  }

  const products: Product[] = [];
  let page = startPage;
  let total = first.total || Infinity;
  const maxPages = 50;

  while (products.length < total && page - startPage < maxPages) {
    const batch =
      page === 0 && startPage === 0
        ? first.products
        : (await fetchProductsPageRaw(search, page, signal)).products;

    if (shop === "fresh") {
      const fresh = batch.filter(isFreshSku);
      products.push(...fresh);
      // Old API: once we leave the kitchen block, empty fresh page means done.
      if (startPage > 0 && fresh.length === 0) break;
    } else if (shop === "kitchen") {
      const kitchen = batch.filter(isKitchenSku);
      products.push(...kitchen);
      if (kitchen.length === 0) break;
    } else if (shop === "cosmetics") {
      const cosmetics = batch.filter(isCosmeticsSku);
      products.push(...cosmetics);
      if (cosmetics.length === 0) break;
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

function attemptWithTimeout<T>(
  attempt: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  return attempt(controller.signal).finally(() => window.clearTimeout(timer));
}

async function withOneRetry<T>(
  attempt: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number
): Promise<T> {
  try {
    return await attemptWithTimeout(attempt, timeoutMs);
  } catch {
    await new Promise((resolve) => window.setTimeout(resolve, CATALOG_RETRY_PAUSE_MS));
    try {
      return await attemptWithTimeout(attempt, timeoutMs);
    } catch (error) {
      if (isAbortError(error)) {
        throw new Error(i18n.t("errors.loadProductsApi"), { cause: error });
      }
      throw error;
    }
  }
}

/** A shop's whole catalogue (full product fields). Slow on a cold API; never await it for first paint. */
export function fetchProducts(params?: {
  category?: string;
  q?: string;
  shop?: "fresh" | "kitchen" | "cosmetics";
}): Promise<Product[]> {
  return withOneRetry((signal) => fetchProductsAttempt(params, signal), CATALOG_ATTEMPT_MS);
}

/**
 * First screen of a shop: one small card-only page. Retried once only if that
 * request fails. 45s is the abort ceiling, not how long a healthy call waits.
 */
export function fetchFirstProductsBatch(
  shop: "fresh" | "kitchen" | "cosmetics",
  pageSize: number
): Promise<ProductListPage> {
  return withOneRetry(
    (signal) => fetchProductListPage({ shop }, 0, pageSize, signal),
    CATALOG_ATTEMPT_MS
  );
}

/**
 * Rest of a small shop (Fresh) as cards, after the first screen is up.
 * Skips description and details JSON — the full-row catalogue is ~400KB and
 * the query that builds it is what stalls a cold database. Not for Kitchen
 * or Cosmetics (tens of thousands of rows).
 */
export function fetchCardCatalog(
  shop: "fresh" | "kitchen" | "cosmetics"
): Promise<ProductListPage> {
  return withOneRetry(
    (signal) => fetchProductListPage({ shop }, 0, 1000, signal),
    CATALOG_ATTEMPT_MS
  );
}

/** One page of a single Kitchen Ware aisle (newest first) — for home-page shelves. */
export async function fetchKitchenAislePage(
  aisleId: string,
  pageSize = 24
): Promise<{ products: Product[]; total: number }> {
  const search = new URLSearchParams({
    shop: "kitchen",
    aisle: aisleId,
    pageSize: String(pageSize),
    // Shelves render cards. Full rows include descriptions and details JSON.
    fields: "card",
  });
  return fetchProductsPageRaw(search, 0);
}

export type ProductSort = "newest" | "top" | "price-asc" | "price-desc" | "name";

/** Server-side filters for a paged product listing (GET /api/products). */
export type ProductListQuery = {
  shop?: "fresh" | "kitchen" | "cosmetics";
  aisle?: string;
  category?: string;
  q?: string;
  sale?: boolean;
  prime?: boolean;
  sort?: ProductSort;
  /** Title must start with one of these words (e.g. a brand's name variants). */
  titlePrefix?: string[];
};

export type ProductListPage = { products: Product[]; total: number; hasMore: boolean };

function listQueryParams(query: ProductListQuery): URLSearchParams {
  const search = new URLSearchParams();
  if (query.shop) search.set("shop", query.shop);
  if (query.aisle) search.set("aisle", query.aisle);
  if (query.category) search.set("category", query.category);
  if (query.q) search.set("q", query.q);
  if (query.sale) search.set("sale", "1");
  if (query.prime) search.set("prime", "1");
  if (query.sort) search.set("sort", query.sort);
  for (const prefix of query.titlePrefix ?? []) search.append("titlePrefix", prefix);
  return search;
}

export async function fetchProductListPage(
  query: ProductListQuery,
  page: number,
  pageSize: number,
  signal?: AbortSignal
): Promise<ProductListPage> {
  const search = listQueryParams(query);
  search.set("page", String(page));
  search.set("pageSize", String(pageSize));
  // Listings only render cards: skip descriptions and the full details JSON.
  search.set("fields", "card");
  const res = await fetch(`${API_BASE}/products?${search.toString()}`, { signal });
  if (!res.ok) throw new Error(i18n.t("errors.loadProductsApi"));
  const data = await res.json();
  const products = (data.products as Product[]) ?? [];
  const total = typeof data.total === "number" ? data.total : 0;
  const hasMore =
    typeof data.hasMore === "boolean" ? data.hasMore : (page + 1) * pageSize < total;
  return { products, total, hasMore };
}

/** Titles of every product matching `query` — lightweight input for facets like brands. */
export async function fetchProductTitles(
  query: ProductListQuery,
  signal?: AbortSignal
): Promise<string[]> {
  const res = await fetch(`${API_BASE}/products/titles?${listQueryParams(query).toString()}`, {
    signal,
  });
  if (!res.ok) throw new Error(i18n.t("errors.loadProductsApi"));
  const data = await res.json();
  return (data.titles as string[]) ?? [];
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

const heroSlideCache = new Map<string, Promise<HeroSlide[]>>();

export async function fetchHeroSlides(
  placement: "home" | "exports" | "kitchen" | "cosmetics" | "onboarding" = "home"
): Promise<HeroSlide[]> {
  const cached = heroSlideCache.get(placement);
  if (cached) return cached;
  const pending = (async () => {
    const res = await fetch(`${API_BASE}/hero/slides?placement=${placement}`);
    if (!res.ok) throw new Error(i18n.t("errors.loadHeroSlides"));
    const data = await res.json();
    return (data.slides as HeroSlide[]) ?? [];
  })().catch((error) => {
    heroSlideCache.delete(placement);
    throw error;
  });
  heroSlideCache.set(placement, pending);
  return pending;
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
