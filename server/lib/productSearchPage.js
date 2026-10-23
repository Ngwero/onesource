/** Share hydrated matches between pages; never refetch every preceding card on scroll. */
export function createSearchPageLoader({ loadCandidates, loadCards }) {
  const products = [];
  const seen = new Set();
  let offset = 0;
  let exhausted = false;
  let pending;
  let skipNoise = false;
  async function advance(needed) {
    const take = Math.min(64, skipNoise ? Math.max(needed, 64) : needed);
    const candidates = await loadCandidates(offset, take);
    // Commit the cursor only after hydration succeeds, so failures can be retried.
    const cards = candidates.length ? await loadCards(candidates) : [];
    const byId = new Map(cards.map((product) => [product.id, product]));
    const before = products.length;
    for (const candidate of candidates) {
      const product = byId.get(candidate.id);
      if (product && !seen.has(product.id)) {
        products.push(product);
        seen.add(product.id);
      }
    }
    skipNoise = products.length - before < candidates.length;
    offset += candidates.length;
    exhausted = candidates.length < take;
  }
  return async ({ page, pageSize }) => {
    const from = page * pageSize;
    const target = from + pageSize + 1;
    while (!exhausted && products.length < target) {
      if (!pending) pending = advance(target - products.length).finally(() => { pending = undefined; });
      await pending;
    }
    const hasMore = products.length > from + pageSize;
    return { products: products.slice(from, from + pageSize),
      total: hasMore ? from + pageSize + 1 : products.length, hasMore };
  };
}

/** One-off adapter for callers that do not keep a paging session. */
export async function collectSearchPage({ page, pageSize, loadCandidates, loadCards }) {
  return createSearchPageLoader({ loadCandidates, loadCards })({ page, pageSize });
}
