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
}
