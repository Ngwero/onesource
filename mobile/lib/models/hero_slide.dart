class HeroSlide {
  const HeroSlide({
    required this.id,
    required this.image,
    required this.badge,
    required this.title,
    required this.subtitle,
    required this.cta,
    required this.ctaHref,
    this.cta2,
    this.cta2Href,
    this.sortOrder = 0,
  });

  final String id;
  final String image;
  final String badge;
  final String title;
  final String subtitle;
  final String cta;
  final String ctaHref;
  final String? cta2;
  final String? cta2Href;
  final int sortOrder;

  factory HeroSlide.fromJson(Map<String, dynamic> json) {
    return HeroSlide(
      id: json['id'] as String? ?? '',
      image: json['image'] as String? ?? '',
      badge: json['badge'] as String? ?? '',
      title: json['title'] as String? ?? '',
      subtitle: json['subtitle'] as String? ?? '',
      cta: json['cta'] as String? ?? 'Shop now',
      ctaHref: json['ctaHref'] as String? ?? json['cta_href'] as String? ?? '/shop',
      cta2: json['cta2'] as String?,
      cta2Href: json['cta2Href'] as String? ?? json['cta2_href'] as String?,
      sortOrder: json['sortOrder'] as int? ?? json['sort_order'] as int? ?? 0,
    );
  }

  String interpolate(String text) {
    return text
        .replaceAll('{{price}}', 'UGX 3,500')
        .replaceAll('{{amount}}', 'UGX 100,000');
  }

  static const fallbackImages = [
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=1400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1598170845058-32b9d55a39dd?w=1400&h=600&fit=crop',
  ];

  static List<HeroSlide> get defaults => [
        for (var i = 0; i < _defaultData.length; i++)
          HeroSlide(
            id: 'hero-${i + 1}',
            image: fallbackImages[i % fallbackImages.length],
            badge: _defaultData[i].badge,
            title: _defaultData[i].title,
            subtitle: _defaultData[i].subtitle,
            cta: _defaultData[i].cta,
            ctaHref: _defaultData[i].ctaHref,
            cta2: _defaultData[i].cta2,
            cta2Href: _defaultData[i].cta2Href,
            sortOrder: i,
          ),
      ];

  static const _defaultData = [
    (
      badge: 'Kampala same-day delivery',
      title: 'Fresh produce for Uganda, delivered',
      subtitle: 'Hand-picked fruit, vegetables & greens — from {{price}} in Kampala',
      cta: 'Shop all categories',
      ctaHref: '/categories',
      cta2: 'Shop fresh fruits',
      cta2Href: '/category/fresh-fruits',
    ),
    (
      badge: 'Market favourites',
      title: 'Sweet bananas & tropical fruit',
      subtitle: 'Ripe bananas, mangoes & more — farm-fresh from {{price}}',
      cta: 'Shop fresh fruits',
      ctaHref: '/category/fresh-fruits',
      cta2: null,
      cta2Href: null,
    ),
    (
      badge: 'Vegetables & greens',
      title: 'Sukuma, tomatoes & garden greens',
      subtitle: 'Daily staples from Ugandan farms — ready for your kitchen',
      cta: 'Shop vegetables',
      ctaHref: '/category/fresh-vegetables',
      cta2: 'View deals',
      cta2Href: '/category/fresh-vegetables',
    ),
    (
      badge: 'Free delivery',
      title: 'Farm-fresh to your door',
      subtitle: 'FREE delivery on orders over {{amount}} — across Greater Kampala',
      cta: 'Start shopping',
      ctaHref: '/categories',
      cta2: null,
      cta2Href: null,
    ),
  ];

  static const kitchenFallbackImages = [
    'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1584990347448-c81a0c2c0f1e?w=1400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1590794056226-9dc76bed5166?w=1400&h=600&fit=crop',
  ];

  static List<HeroSlide> get kitchenDefaults => [
        for (var i = 0; i < _kitchenDefaultData.length; i++)
          HeroSlide(
            id: 'kitchen-hero-${i + 1}',
            image: kitchenFallbackImages[i % kitchenFallbackImages.length],
            badge: _kitchenDefaultData[i].badge,
            title: _kitchenDefaultData[i].title,
            subtitle: _kitchenDefaultData[i].subtitle,
            cta: _kitchenDefaultData[i].cta,
            ctaHref: _kitchenDefaultData[i].ctaHref,
            cta2: _kitchenDefaultData[i].cta2,
            cta2Href: _kitchenDefaultData[i].cta2Href,
            sortOrder: i,
          ),
      ];

      static const _kitchenDefaultData = [
    (
      badge: 'Kitchen Ware',
      title: 'Cookware for every kitchen',
      subtitle: 'Saucepans, pans & sets — Kampala-ready prices',
      cta: 'Shop cookware',
      ctaHref: '/kitchen/aisle/cookware',
      cta2: 'Browse aisles',
      cta2Href: '/kitchen/categories',
    ),
    (
      badge: 'Saucepans first',
      title: 'Everyday saucepans & pots',
      subtitle: 'Stainless, non-stick and more for daily cooking',
      cta: 'Shop saucepans',
      ctaHref: '/kitchen/aisle/cookware',
      cta2: null,
      cta2Href: null,
    ),
    (
      badge: 'Tabletop & organisation',
      title: 'Set the table, organise the room',
      subtitle: 'Tabletop, small furniture and kitchen organisation',
      cta: 'Shop tabletop',
      ctaHref: '/kitchen/aisle/tabletop',
      cta2: 'Shop all',
      cta2Href: '/kitchen/shop',
    ),
    (
      badge: 'Same basket',
      title: 'Kitchen + fresh in one order',
      subtitle: 'Add cookware to your produce basket for one delivery',
      cta: 'Shop kitchen',
      ctaHref: '/kitchen/shop',
      cta2: null,
      cta2Href: null,
    ),
  ];

  static const onboardingFallbackImages = [
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&h=1200&fit=crop',
    'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&h=1200&fit=crop',
    'https://images.unsplash.com/photo-1550989460-0adf9ea7628c?w=1200&h=1200&fit=crop',
  ];

  static List<HeroSlide> get onboardingDefaults => [
        for (var i = 0; i < _onboardingDefaultData.length; i++)
          HeroSlide(
            id: "onboarding-${i + 1}",
            image: onboardingFallbackImages[i % onboardingFallbackImages.length],
            badge: _onboardingDefaultData[i].badge,
            title: _onboardingDefaultData[i].title,
            subtitle: _onboardingDefaultData[i].subtitle,
            cta: _onboardingDefaultData[i].cta,
            ctaHref: '/home',
            sortOrder: i,
          ),
      ];

  static const _onboardingDefaultData = [
    (
      badge: 'Fresh produce',
      title: 'Your shop.\nYour time.',
      subtitle:
          'Groceries when you need them — clear prices, Kampala delivery, your way.',
      cta: 'Continue',
    ),
    (
      badge: 'Kitchen ware',
      title: 'Cookware\nin the same app',
      subtitle:
          'Pots, pans and tabletop — drop cookware into the same basket as produce.',
      cta: 'Continue',
    ),
    (
      badge: 'One Source',
      title: 'One basket.\nOne delivery.',
      subtitle:
          'Fresh + kitchen together. Free delivery over UGX 100k across Kampala.',
      cta: 'Get started',
    ),
  ];
}
