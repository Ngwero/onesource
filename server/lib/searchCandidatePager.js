/** A stable, incremental stream: exact names first, related tags second.
 * Concurrent pages share work; no full-catalogue scan blocks the first page.
 */
export function createSearchCandidatePager({ loadBatch, matches, rank = (rows) => rows, phases = ['direct', 'related'], batchSize = 64 }) {
  const products = [];
  const seen = new Set();
  let phase = 0;
  let offset = 0;
  let pending;
  let skipNoise = false;
  async function advance(needed) {
    const take = Math.min(batchSize, skipNoise ? Math.max(needed, batchSize) : needed);
    const rows = await loadBatch(phases[phase], offset, take);
    const before = products.length;
    for (const product of rank(rows.filter(matches))) {
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      products.push(product);
    }
    skipNoise = products.length - before < rows.length;
    if (rows.length < take) { phase++; offset = 0; }
    else offset += take;
  }
  return async (from, size) => {
    while (products.length < from + size && phase < phases.length) {
      if (!pending) pending = advance(from + size - products.length).finally(() => { pending = undefined; });
      await pending;
    }
    return products.slice(from, from + size);
  };
}
