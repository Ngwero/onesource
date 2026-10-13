import { useEffect, useRef, useState } from "react";
import { fetchKitchenAislePage } from "../api/client";
import { aisleIdFromProductId } from "../data/kitchenWare";
import type { Product } from "../types/product";

const SHELF_SIZE = 24;

const shelfCache = new Map<string, Promise<Product[]>>();

/** Cached per session so returning to the Kitchen home is instant. */
export function loadKitchenAisleShelf(aisleId: string): Promise<Product[]> {
  let pending = shelfCache.get(aisleId);
  if (!pending) {
    pending = fetchKitchenAislePage(aisleId, SHELF_SIZE)
      .then(({ products }) =>
        products.filter(
          (p) => Boolean(p.image) && aisleIdFromProductId(p.id) === aisleId
        )
      )
      .catch(() => {
        shelfCache.delete(aisleId);
        return [];
      });
    shelfCache.set(aisleId, pending);
  }
  return pending;
}

/** Flips to true once the element comes within `rootMargin` of the viewport. */
export function useNearViewport<T extends HTMLElement = HTMLDivElement>(
  rootMargin = "600px 0px"
) {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (near) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [near, rootMargin]);

  return { ref, near };
}

/** Loads one or more aisle shelves once `enabled` turns true. */
export function useKitchenAisleShelves(aisleIds: readonly string[], enabled: boolean) {
  const key = aisleIds.join(",");
  const [state, setState] = useState<{
    key: string;
    shelves: Product[][];
  } | null>(null);

  useEffect(() => {
    if (!enabled || !key) return;
    let cancelled = false;
    Promise.all(key.split(",").map(loadKitchenAisleShelf)).then((shelves) => {
      if (!cancelled) setState({ key, shelves });
    });
    return () => {
      cancelled = true;
    };
  }, [key, enabled]);

  const ready = state?.key === key;
  return {
    shelves: ready ? state.shelves : [],
    loading: !ready,
  };
}
