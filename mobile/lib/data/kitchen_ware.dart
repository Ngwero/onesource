/// Kitchen Ware aisle definitions — keep in sync with
/// `src/data/kitchenWare.ts` and `server/data/kitchenWareCatalog.js`.
const kitchenWareCategoryId = 'kitchen-ware';

class KitchenAisle {
  const KitchenAisle({
    required this.id,
    required this.title,
    required this.icon,
    required this.accentArgb,
  });

  final String id;
  final String title;
  final String icon;
  /// ARGB int, e.g. `0xFF8A8F98`.
  final int accentArgb;
}

const kitchenWareAisles = <KitchenAisle>[
  KitchenAisle(id: 'cookware', title: 'Cookware', icon: '🍳', accentArgb: 0xFF8A8F98),
  KitchenAisle(id: 'stainless-clad', title: 'Stainless clad', icon: '🥄', accentArgb: 0xFF9AA3AD),
  KitchenAisle(id: 'carbon-steel', title: 'Carbon steel', icon: '🔥', accentArgb: 0xFF5C5C5C),
  KitchenAisle(id: 'cast-iron', title: 'Enamelled cast iron', icon: '🥘', accentArgb: 0xFF8B3A2A),
  KitchenAisle(id: 'non-stick', title: 'Non-stick', icon: '🍳', accentArgb: 0xFF3D4A5C),
  KitchenAisle(
    id: 'cookware-accessories',
    title: 'Cookware accessories',
    icon: '🧰',
    accentArgb: 0xFF6D7A68,
  ),
  KitchenAisle(id: 'tabletop', title: 'Tabletop', icon: '🍽️', accentArgb: 0xFFB7A99A),
  KitchenAisle(
    id: 'small-furniture',
    title: 'Kitchen small furniture',
    icon: '🛒',
    accentArgb: 0xFF4A6FA5,
  ),
  KitchenAisle(id: 'extractor-hoods', title: 'Extractor hoods', icon: '💨', accentArgb: 0xFF6B7280),
  KitchenAisle(
    id: 'countertops-sinks',
    title: 'Countertops, faucets and sinks',
    icon: '🚰',
    accentArgb: 0xFF7D8B95,
  ),
  KitchenAisle(
    id: 'organization',
    title: 'Organization in the kitchen',
    icon: '🧺',
    accentArgb: 0xFF7A8F6E,
  ),
];

String? aisleIdFromProductId(String productId) {
  final ordered = [...kitchenWareAisles]..sort((a, b) => b.id.length.compareTo(a.id.length));
  for (final aisle in ordered) {
    if (productId.startsWith('kitchen-${aisle.id}-')) return aisle.id;
  }
  return null;
}

KitchenAisle? kitchenAisleById(String? id) {
  if (id == null) return null;
  for (final aisle in kitchenWareAisles) {
    if (aisle.id == id) return aisle;
  }
  return null;
}

bool isValidKitchenAisleId(String? id) => kitchenAisleById(id) != null;

String kitchenAislePath(String aisleId) => '/kitchen/aisle/$aisleId';
