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

/// Retired aisles that must never appear as Kitchen categories or home rows.
const kitchenHomeHiddenAisleIds = <String>{
  'small-furniture',
  'extractor-hoods',
  'countertops-sinks',
};

/// First Kitchen home aisle rows, before the plates and cups shelves.
const kitchenHomePinnedAisleIds = <String>[
  'non-stick',
  'carbon-steel',
  'small-appliances',
];

/// Remaining home aisles after plates/cups, packed first (live size desc).
const kitchenHomePackedAisleOrder = <String>[
  'cookware-accessories',
  'tabletop',
  'organization',
  'cookware',
  'stainless-clad',
  'cast-iron',
];

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
  KitchenAisle(id: 'small-appliances', title: 'Small appliances', icon: '🔌', accentArgb: 0xFFA0522D),
  KitchenAisle(id: 'tabletop', title: 'Tabletop', icon: '🍽️', accentArgb: 0xFFB7A99A),
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

bool isKitchenHomeHiddenAisle(String? id) =>
    id != null && kitchenHomeHiddenAisleIds.contains(id);

bool isValidKitchenAisleId(String? id) =>
    kitchenAisleById(id) != null && !isKitchenHomeHiddenAisle(id);

/// Kitchen Ware aisles shown in home, chips, tiles, and See-all lists.
List<KitchenAisle> kitchenVisibleAisles() => [
      for (final aisle in kitchenWareAisles)
        if (!kitchenHomeHiddenAisleIds.contains(aisle.id)) aisle,
    ];

String kitchenAislePath(String aisleId) => '/kitchen/aisle/$aisleId';

List<KitchenAisle> kitchenHomePinnedAisles() => [
      for (final id in kitchenHomePinnedAisleIds)
        if (kitchenAisleById(id) != null) kitchenAisleById(id)!,
    ];

List<KitchenAisle> kitchenHomePackedAisles() {
  final pinned = kitchenHomePinnedAisleIds.toSet();
  final remaining = [
    for (final aisle in kitchenWareAisles)
      if (!pinned.contains(aisle.id) &&
          !kitchenHomeHiddenAisleIds.contains(aisle.id))
        aisle,
  ];
  remaining.sort((a, b) {
    final ai = kitchenHomePackedAisleOrder.indexOf(a.id);
    final bi = kitchenHomePackedAisleOrder.indexOf(b.id);
    final ao = ai < 0 ? kitchenHomePackedAisleOrder.length : ai;
    final bo = bi < 0 ? kitchenHomePackedAisleOrder.length : bi;
    return ao.compareTo(bo);
  });
  return remaining;
}
