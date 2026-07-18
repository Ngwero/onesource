/** Default homepage hero carousel (seed + API fallback) — Uganda market. */
export const DEFAULT_HERO_SLIDES = [
  {
    id: "hero-1",
    sortOrder: 0,
    image:
      "https://images.unsplash.com/photo-1598170845058-32b9d55a39dd?w=1400&h=600&fit=crop",
    badge: "Kampala same-day delivery",
    title: "Fresh produce for Uganda, delivered",
    subtitle: "Hand-picked fruit, vegetables & greens — from {{price}} in Kampala",
    cta: "Shop all categories",
    ctaHref: "/categories",
    cta2: "Shop fresh fruits",
    cta2Href: "/category/fresh-fruits",
    active: true,
  },
  {
    id: "hero-2",
    sortOrder: 1,
    image:
      "https://images.unsplash.com/photo-1603833660818-4e1477a4c4d7?w=1400&h=600&fit=crop",
    badge: "Market favourites",
    title: "Sweet bananas & tropical fruit",
    subtitle: "Ripe bananas, mangoes & more — farm-fresh from {{price}}",
    cta: "Shop fresh fruits",
    ctaHref: "/category/fresh-fruits",
    active: true,
  },
  {
    id: "hero-3",
    sortOrder: 2,
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1400&h=600&fit=crop",
    badge: "Vegetables & greens",
    title: "Sukuma, tomatoes & garden greens",
    subtitle: "Daily staples from Ugandan farms — ready for your kitchen",
    cta: "Shop vegetables",
    ctaHref: "/category/fresh-vegetables",
    cta2: "View deals",
    cta2Href: "/category/fresh-vegetables",
    active: true,
  },
  {
    id: "hero-4",
    sortOrder: 3,
    image:
      "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1400&h=600&fit=crop",
    badge: "Free delivery",
    title: "Farm-fresh to your door",
    subtitle: "FREE delivery on orders over {{amount}} — across Greater Kampala",
    cta: "Start shopping",
    ctaHref: "/categories",
    active: true,
  },
];

/** Default exports-page hero carousel. The `export-` ID prefix identifies its placement. */
export const DEFAULT_EXPORT_HERO_SLIDES = [
  {
    id: "export-hero-1",
    sortOrder: 0,
    image:
      "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=1920&q=75&auto=format&fit=crop",
    badge: "Global exports",
    title: "Uganda's freshest produce, delivered to the world",
    subtitle:
      "Certified produce, cold-chain protected and air-freighted from Entebbe to international markets.",
    cta: "Browse export produce",
    ctaHref: "/category/export-fresh-produce",
    active: true,
  },
  {
    id: "export-hero-2",
    sortOrder: 1,
    image:
      "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1920&q=75&auto=format&fit=crop",
    badge: "Export-grade quality",
    title: "Packed for international markets",
    subtitle:
      "Carefully graded, documented and packed to protect freshness throughout the journey.",
    cta: "Place an order",
    ctaHref: "/category/export-fresh-produce",
    active: true,
  },
  {
    id: "export-hero-3",
    sortOrder: 2,
    image:
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1920&q=75&auto=format&fit=crop",
    badge: "Reliable air freight",
    title: "From Uganda to your market",
    subtitle:
      "Established export lanes connect our partner farms with buyers across Africa, Europe and the Gulf.",
    cta: "Talk to our export team",
    ctaHref: "#export-contact",
    active: true,
  },
];
