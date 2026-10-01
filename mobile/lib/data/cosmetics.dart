import '../models/product.dart';

class CosmeticsAisle {
  const CosmeticsAisle({required this.id, required this.title, required this.icon});

  final String id;
  final String title;
  final String icon;
}

/// Same aisles as the website (`src/data/cosmetics.ts`); ids match `cosmetics-{aisle}-…` SKUs.
const cosmeticsAisles = <CosmeticsAisle>[
  CosmeticsAisle(id: 'face-makeup', title: 'Face makeup', icon: '💄'),
  CosmeticsAisle(id: 'eye-makeup', title: 'Eye makeup', icon: '👁️'),
  CosmeticsAisle(id: 'lips', title: 'Lips', icon: '💋'),
  CosmeticsAisle(id: 'face-eye-care', title: 'Face & eye care', icon: '🧖'),
  CosmeticsAisle(id: 'serums-oils', title: 'Serums & oils', icon: '💧'),
  CosmeticsAisle(id: 'cleansers-bars', title: 'Cleansers & bars', icon: '🧼'),
  CosmeticsAisle(id: 'sun-protection', title: 'Sun protection', icon: '☀️'),
  CosmeticsAisle(id: 'acne-care', title: 'Acne care', icon: '✨'),
  CosmeticsAisle(id: 'body-care', title: 'Body care', icon: '🧴'),
  CosmeticsAisle(id: 'hair-baby-more', title: 'Hair, fragrance & more', icon: '🌸'),
  CosmeticsAisle(id: 'kits-bundles', title: 'Kits & gift sets', icon: '🎁'),
  CosmeticsAisle(id: 'brushes-tools', title: 'Brushes & tools', icon: '🖌️'),
];

CosmeticsAisle? cosmeticsAisleById(String id) {
  for (final aisle in cosmeticsAisles) {
    if (aisle.id == id) return aisle;
  }
  return null;
}

String cosmeticsAislePath(String id) => '/cosmetics/aisle/$id';

bool isCosmeticsPath(String location) {
  final path = Uri.tryParse(location)?.path ?? location;
  if (path == '/cosmetics' || path.startsWith('/cosmetics/')) return true;
  return path.startsWith('/product/cosmetics-');
}

bool isCosmeticsProduct(Product? product) {
  if (product == null) return false;
  return product.id.startsWith('cosmetics-') || product.category == 'cosmetics';
}

/// Aisle id from `cosmetics-{aisle}-{source}-{id}`.
String? cosmeticsAisleIdFromProductId(String id) {
  if (!id.startsWith('cosmetics-')) return null;
  final rest = id.substring('cosmetics-'.length);
  for (final aisle in cosmeticsAisles) {
    if (rest.startsWith('${aisle.id}-')) return aisle.id;
  }
  return null;
}

const _heroBase = 'https://www.onesourco.com/cosmetics/hero';

/// Built-in Cosmetics hero banners (same artwork as the website).
const cosmeticsHeroSlides = <({String key, String image, String href, String? href2})>[
  (key: 'gifts', image: '$_heroBase/gifts.webp', href: '/cosmetics/aisle/kits-bundles', href2: null),
  (
    key: 'makeup',
    image: '$_heroBase/makeup.webp',
    href: '/cosmetics/aisle/face-makeup',
    href2: '/cosmetics/aisle/eye-makeup',
  ),
  (
    key: 'skincare',
    image: '$_heroBase/skincare.webp',
    href: '/cosmetics/aisle/serums-oils',
    href2: '/cosmetics/aisle/sun-protection',
  ),
  (key: 'fragrance', image: '$_heroBase/fragrance.webp', href: '/cosmetics/aisle/hair-baby-more', href2: null),
];
