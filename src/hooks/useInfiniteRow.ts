import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { fetchProductListPage, type ProductListQuery } from "../api/client";
import type { Product } from "../types/product";

export const ROW_PAGE_SIZE = 18;
/** How far before the row's right edge the next page starts loading. */
const ROW_NEAR_END_MARGIN = "0px 600px 0px 0px";
const MAX_CACHED_ROWS = 40;

type Status = "idle" | "loading" | "error";

type RowState = {
  key: string;
  products: Product[];
  hasMore: boolean;
  nextPage: number;
  status: Status;
};

type CachedRow = Omit<RowState, "key" | "status"> & { scrollLeft: number };

/** Pages already loaded per row this session, so coming back to the page is instant. */
const rowCache = new Map<string, CachedRow>();

function rememberRow(state: RowState) {
  const prev = rowCache.get(state.key);
  rowCache.delete(state.key);
  rowCache.set(state.key, {
    products: state.products,
    hasMore: state.hasMore,
    nextPage: state.nextPage,
    scrollLeft: prev?.scrollLeft ?? 0,
  });
  while (rowCache.size > MAX_CACHED_ROWS) {
    const oldest = rowCache.keys().next().value;
    if (oldest === undefined) break;
    rowCache.delete(oldest);
  }
}

function rowKey(query: ProductListQuery, pageSize: number): string {
  const normalized = Object.fromEntries(
    Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== "" && v !== false)
      .sort(([a], [b]) => a.localeCompare(b))
  );
  return JSON.stringify({ query: normalized, pageSize });
}

function initialRow(key: string, seed: Product[]): RowState {
  const hit = rowCache.get(key);
  if (hit) {
    return { key, products: hit.products, hasMore: hit.hasMore, nextPage: hit.nextPage, status: "idle" };
  }
  return { key, products: seed, hasMore: true, nextPage: 0, status: "idle" };
}

function mergeById(existing: Product[], incoming: Product[]): Product[] {
  const seen = new Set(existing.map((p) => p.id));
  const merged = [...existing];
  for (const p of incoming) {
    if (seen.has(p.id) || !p.image) continue;
    seen.add(p.id);
    merged.push(p);
  }
  return merged;
}

export type InfiniteRowState = {
  products: Product[];
  hasMore: boolean;
  loading: boolean;
  error: boolean;
  /** Requests the next page now (e.g. the right arrow was pressed near the end). */
  loadMore: () => void;
  scrollerRef: (el: HTMLElement | null) => void;
  sentinelRef: (el: HTMLElement | null) => void;
};

/**
 * Horizontal product row that starts from `seed` and pages in more of `query`
 * whenever the user scrolls close to its right edge, until every match is shown.
 * Nothing is fetched while `active` is false (row still far from the viewport).
 */
export function useInfiniteRow(
  query: ProductListQuery,
  seed: Product[],
  { active, pageSize = ROW_PAGE_SIZE }: { active: boolean; pageSize?: number }
): InfiniteRowState {
  const key = rowKey(query, pageSize);
  const [state, setState] = useState<RowState>(() => initialRow(key, seed));
  const view = state.key === key ? state : initialRow(key, seed);
  const abortRef = useRef<AbortController | null>(null);
  const [scroller, setScroller] = useState<HTMLElement | null>(null);
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null);

  const loadMore = useCallback(() => {
    if (!active || view.status === "loading" || !view.hasMore) return;
    const page = view.nextPage;
    setState({ ...view, status: "loading" });
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { query: q } = JSON.parse(key) as { query: ProductListQuery };

    fetchProductListPage(q, page, pageSize, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setState((prev) => {
          const base = prev.key === key ? prev : initialRow(key, seed);
          const next: RowState = {
            key,
            products: mergeById(base.products, res.products),
            hasMore: res.hasMore && res.products.length > 0,
            nextPage: page + 1,
            status: "idle",
          };
          rememberRow(next);
          return next;
        });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setState((prev) => ({ ...(prev.key === key ? prev : initialRow(key, seed)), status: "error" }));
      });
  }, [active, key, pageSize, seed, view]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  });

  // Re-armed after every page so a sentinel that is still in range keeps loading.
  const generation = `${key}:${view.products.length}:${view.status}`;
  useEffect(() => {
    if (!active || !scroller || !sentinel || view.status !== "idle") return;
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMoreRef.current();
      },
      { root: scroller, rootMargin: ROW_NEAR_END_MARGIN }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [active, scroller, sentinel, generation, view.status]);

  // Restore and remember how far the row was scrolled.
  useLayoutEffect(() => {
    if (!scroller) return;
    const cached = rowCache.get(key);
    if (cached?.scrollLeft) scroller.scrollTo({ left: cached.scrollLeft, behavior: "instant" });
    const onScroll = () => {
      const entry = rowCache.get(key);
      if (entry) entry.scrollLeft = scroller.scrollLeft;
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [scroller, key]);

  return {
    products: view.products,
    hasMore: view.hasMore,
    loading: view.status === "loading",
    error: view.status === "error",
    loadMore,
    scrollerRef: setScroller,
    sentinelRef: setSentinel,
  };
}
