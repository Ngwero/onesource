import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigationType } from "react-router-dom";
import {
  fetchProductListPage,
  type ProductListQuery,
} from "../api/client";
import type { Product } from "../types/product";

export const LISTING_PAGE_SIZE = 36;
const NEAR_END_MARGIN = "800px 0px";
const MAX_CACHED_LISTS = 24;

type Status = "loading" | "idle" | "error";

type ListState = {
  key: string | null;
  products: Product[];
  total: number;
  hasMore: boolean;
  nextPage: number;
  status: Status;
};

type CachedList = Omit<ListState, "key" | "status"> & { scrollY: number };

/** Pages already loaded this session, so going back to a listing is instant. */
const listCache = new Map<string, CachedList>();

function rememberList(key: string, state: ListState) {
  const prev = listCache.get(key);
  listCache.delete(key);
  listCache.set(key, {
    products: state.products,
    total: state.total,
    hasMore: state.hasMore,
    nextPage: state.nextPage,
    scrollY: prev?.scrollY ?? 0,
  });
  while (listCache.size > MAX_CACHED_LISTS) {
    const oldest = listCache.keys().next().value;
    if (oldest === undefined) break;
    listCache.delete(oldest);
  }
}

function listKey(query: ProductListQuery, pageSize: number): string {
  const normalized = Object.fromEntries(
    Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== "" && v !== false && !(Array.isArray(v) && !v.length))
      .sort(([a], [b]) => a.localeCompare(b))
  );
  return JSON.stringify({ query: normalized, pageSize });
}

function initialState(key: string | null): ListState {
  const hit = key ? listCache.get(key) : undefined;
  if (key && hit) {
    return {
      key,
      products: hit.products,
      total: hit.total,
      hasMore: hit.hasMore,
      nextPage: hit.nextPage,
      status: "idle",
    };
  }
  return { key, products: [], total: 0, hasMore: Boolean(key), nextPage: 0, status: key ? "loading" : "idle" };
}

function mergeById(existing: Product[], incoming: Product[]): Product[] {
  const seen = new Set(existing.map((p) => p.id));
  const merged = [...existing];
  for (const p of incoming) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    merged.push(p);
  }
  return merged;
}

/**
 * Calls `onNear` whenever the returned ref's element is within `rootMargin` of the
 * viewport. The observer is re-armed whenever `generation` changes, so a sentinel
 * that is still on screen after new items render triggers again.
 */
export function useNearViewportSentinel(
  onNear: () => void,
  generation: unknown,
  rootMargin = NEAR_END_MARGIN
) {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const onNearRef = useRef(onNear);
  useEffect(() => {
    onNearRef.current = onNear;
  });

  useEffect(() => {
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      const id = window.setTimeout(() => onNearRef.current(), 0);
      return () => window.clearTimeout(id);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onNearRef.current();
      },
      { rootMargin }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, rootMargin, generation]);

  return setElement;
}

export type InfiniteListState = {
  products: Product[];
  total: number;
  hasMore: boolean;
  /** First page in flight with nothing to show yet. */
  initialLoading: boolean;
  /** Any page in flight. */
  loading: boolean;
  error: boolean;
  retry: () => void;
  sentinelRef: (el: HTMLElement | null) => void;
};

/**
 * Server-paged product listing that loads the next page whenever the sentinel
 * (rendered by `InfiniteScrollFooter`) nears the viewport, until every match is shown.
 * Pass `null` to pause (e.g. empty search query).
 */
export function useInfiniteProducts(
  query: ProductListQuery | null,
  { pageSize = LISTING_PAGE_SIZE }: { pageSize?: number } = {}
): InfiniteListState {
  const key = query ? listKey(query, pageSize) : null;
  const [state, setState] = useState<ListState>(() => initialState(key));
  const view = state.key === key ? state : initialState(key);
  const abortRef = useRef<AbortController | null>(null);
  const navigationType = useNavigationType();

  /** Fetches `page` for the current key; state only changes once the response settles. */
  const startFetch = useCallback(
    (page: number) => {
      if (!key) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const { query: q, pageSize: size } = JSON.parse(key) as {
        query: ProductListQuery;
        pageSize: number;
      };

      fetchProductListPage(q, page, size, controller.signal)
        .then((res) => {
          if (controller.signal.aborted) return;
          setState((prev) => {
            const base = prev.key === key ? prev : initialState(key);
            const next: ListState = {
              key,
              products: mergeById(page === 0 ? [] : base.products, res.products),
              total: res.total,
              hasMore: res.hasMore,
              nextPage: page + 1,
              status: "idle",
            };
            rememberList(key, next);
            return next;
          });
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setState((prev) => ({
            ...(prev.key === key ? prev : initialState(key)),
            status: "error",
          }));
        });
    },
    [key]
  );

  const loadNext = useCallback(() => {
    if (!key || view.status === "loading" || !view.hasMore) return;
    setState({ ...view, status: "loading" });
    startFetch(view.nextPage);
  }, [key, view, startFetch]);

  useEffect(() => {
    if (!key) return;
    if (!listCache.has(key)) startFetch(0);
    return () => abortRef.current?.abort();
  }, [key, startFetch]);

  // Back/forward to a cached listing: put the user where they left off.
  useEffect(() => {
    if (!key) return;
    const cached = listCache.get(key);
    let frame = 0;
    if (navigationType === "POP" && cached?.scrollY) {
      const y = cached.scrollY;
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "instant" }));
      });
    }
    return () => {
      cancelAnimationFrame(frame);
      const entry = listCache.get(key);
      if (entry) entry.scrollY = window.scrollY;
    };
  }, [key, navigationType]);

  const sentinelRef = useNearViewportSentinel(
    () => {
      if (view.status === "idle") loadNext();
    },
    `${key}:${view.nextPage}:${view.status}`
  );

  return {
    products: view.products,
    total: view.total,
    hasMore: view.hasMore,
    initialLoading: view.status === "loading" && view.products.length === 0,
    loading: view.status === "loading",
    error: view.status === "error",
    retry: loadNext,
    sentinelRef,
  };
}

/**
 * Client-side counterpart for lists already in memory (e.g. the Fresh catalogue):
 * reveals `step` more items each time the sentinel nears the viewport.
 */
export function useProgressiveReveal<T>(items: T[], step = LISTING_PAGE_SIZE) {
  const [limit, setLimit] = useState(step);
  const [source, setSource] = useState(items);

  let currentLimit = limit;
  if (source !== items) {
    setSource(items);
    setLimit(step);
    currentLimit = step;
  }

  const hasMore = currentLimit < items.length;
  const sentinelRef = useNearViewportSentinel(() => {
    if (hasMore) setLimit((n) => n + step);
  }, currentLimit);

  return {
    visible: hasMore ? items.slice(0, currentLimit) : items,
    hasMore,
    sentinelRef,
  };
}
