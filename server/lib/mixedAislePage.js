/** Slice a round-robin stream without skipping the unused tail of any aisle. */
export function mixedAislePage(aisleIds, page, pageSize) {
  const start = page * pageSize;
  const end = start + pageSize;
  const count = aisleIds.length;
  return aisleIds.map((aisleId, index) => {
    const from = Math.max(0, Math.ceil((start - index) / count));
    const until = Math.max(0, Math.ceil((end - index) / count));
    return { aisleId, from, take: until - from, index };
  });
}

export function interleaveAislePage(plans, batches, aisleCount) {
  return plans.flatMap((plan, i) => batches[i].slice(0, plan.take).map((product, offset) => ({
    product, position: (plan.from + offset) * aisleCount + plan.index,
  }))).sort((a, b) => a.position - b.position).map(({ product }) => product);
}
