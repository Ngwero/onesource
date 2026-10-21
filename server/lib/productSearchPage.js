/** Page only eligible products, even when an entire candidate batch is excluded. */
export async function collectSearchPage({ page, pageSize, loadCandidates, loadCards }) {
  const from = page * pageSize;
  const target = from + pageSize + 1;
  const batchSize = Math.min(1000, Math.max(64, pageSize + 1));
  const matches = [];
  let offset = 0;
  while (matches.length < target) {
    const candidates = await loadCandidates(offset, batchSize);
    if (!candidates.length) break;
    const cards = await loadCards(candidates);
    const byId = new Map(cards.map((product) => [product.id, product]));
    for (const candidate of candidates) {
      const product = byId.get(candidate.id);
      if (product) matches.push(product);
    }
    if (candidates.length < batchSize) break;
    offset += batchSize;
  }
  const hasMore = matches.length > from + pageSize;
  return {
    products: matches.slice(from, from + pageSize),
    total: hasMore ? from + pageSize + 1 : matches.length,
    hasMore,
  };
}
