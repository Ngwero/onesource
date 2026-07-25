/** Default Kitchen Ware inspiration collage (IKEA-style hero).
 * Layout: large left + middle column (2) + right 2×2 (4) = 7 slots.
 */
export const KITCHEN_COLLAGE_SLOT_COUNT = 7;

export const DEFAULT_KITCHEN_COLLAGE = {
  id: "kitchen-inspiration",
  introTitle: "",
  introBody: "",
  images: [
    {
      url: "https://www.youtube.com/shorts/tXu7eyoWGvs",
      alt: "Modern kitchen design video",
      href: "",
    },
    {
      url: "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?auto=format&fit=crop&w=900&q=80",
      alt: "Open kitchen cabinets with organised storage",
      href: "/kitchen/aisle/organization",
    },
    {
      url: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80",
      alt: "Walk-in pantry with shelves",
      href: "/kitchen/aisle/organization",
    },
    {
      url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=80",
      alt: "Open shelving with glass jars",
      href: "/kitchen/aisle/organization",
    },
    {
      url: "https://images.unsplash.com/photo-1556911220-bff31c812dce?auto=format&fit=crop&w=900&q=80",
      alt: "Kitchen drawer with storage containers",
      href: "/kitchen/aisle/cookware",
    },
    {
      url: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=900&q=80",
      alt: "Kitchen counter with cookware",
      href: "/kitchen/aisle/cookware",
    },
    {
      url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80",
      alt: "Bright modern kitchen interior",
      href: "/kitchen/aisle/organization",
    },
  ],
  active: true,
};

/**
 * Normalize collage images to 7 slots.
 * Order: [hero, mid-top, mid-bottom, right-TL, right-TR, right-BL, right-BR]
 * Legacy 5: [hero, mid-top, mid-bottom, right-top, right-bottom]
 * → split each right image across the 2×2 row (duplicate until replaced).
 */
export function normalizeKitchenCollageImages(images = []) {
  const list = Array.isArray(images) ? images : [];
  const at = (i) => {
    const img = list[i] || {};
    const startRaw = img.startSeconds ?? img.start_seconds;
    let startSeconds;
    if (startRaw !== undefined && startRaw !== null && startRaw !== "") {
      const n = Number(startRaw);
      if (Number.isFinite(n) && n >= 0) startSeconds = Math.floor(n);
    }
    return {
      url: img.url ?? "",
      alt: img.alt ?? "",
      href: img.href ?? "",
      ...(startSeconds !== undefined ? { startSeconds } : {}),
    };
  };

  // Legacy 5-slot: right column (indices 3,4) → 2×2
  if (list.length === 5) {
    return [at(0), at(1), at(2), at(3), at(3), at(4), at(4)];
  }

  // Previous mistaken layout: [hero, topMid, topRight, lower…]
  // If already 7, keep as-is (admin/local source of truth).
  return Array.from({ length: KITCHEN_COLLAGE_SLOT_COUNT }, (_, i) => at(i));
}
