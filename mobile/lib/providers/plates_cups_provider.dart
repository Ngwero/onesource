import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/kitchen_ware.dart';
import '../models/product.dart';
import 'paginated_products_provider.dart';

class TabletopSearchShelves {
  const TabletopSearchShelves({required this.plates, required this.cups});

  final List<Product> plates;
  final List<Product> cups;

  List<Product> get featured => [...plates, ...cups];
}

class KitchenHomeShelf {
  const KitchenHomeShelf({
    required this.id,
    required this.aisle,
    required this.products,
    this.seeMorePath,
  });

  final String id;
  final KitchenAisle aisle;
  final List<Product> products;
  final String? seeMorePath;

  List<Product> get featured => products;
}

/// Identify the original photo even when cards use different resize URLs.
String previewImageKey(String image) {
  final value = image.trim();
  if (value.isEmpty || value.contains('/placeholders/')) return '';
  if (value.startsWith('data:')) return value;
  final uri = Uri.tryParse(value);
  if (uri == null || !uri.hasScheme) return value;
  if (uri.path == '/api/img') {
    final source = uri.queryParameters['src'];
    if (source != null && source.isNotEmpty && !source.contains('/api/img')) {
      return previewImageKey(source);
    }
  }
  if (uri.host.endsWith('.supabase.co') &&
      (uri.path.contains('/storage/v1/object/public/') ||
          uri.path.contains('/storage/v1/render/image/public/'))) {
    return uri.replace(
      path: uri.path.replaceFirst('/render/image/', '/object/'),
      query: '',
      fragment: '',
    ).toString();
  }
  const drop = {
    'w',
    'h',
    'width',
    'height',
    'q',
    'quality',
    'fit',
    'crop',
    'auto',
    'fm',
    'format',
    'dpr',
    'resize',
  };
  final kept = Map<String, String>.from(uri.queryParameters)
    ..removeWhere((key, _) => drop.contains(key));
  final keys = kept.keys.toList()..sort();
  return uri.replace(
    queryParameters: {for (final key in keys) key: kept[key]!},
    fragment: '',
  ).toString();
}

List<Product> uniqueShelfProducts(
  List<Product> products, {
  Iterable<Product> exclude = const [],
}) {
  final result = <Product>[];
  final ids = <String>{};
  final images = <String>{};
  for (final product in exclude) {
    if (product.id.isNotEmpty) ids.add(product.id);
    final key = previewImageKey(product.image);
    if (key.isNotEmpty) images.add(key);
  }
  for (final product in products) {
    final key = previewImageKey(product.image);
    if (key.isEmpty ||
        ids.contains(product.id) ||
        images.contains(key)) {
      continue;
    }
    ids.add(product.id);
    images.add(key);
    result.add(product);
  }
  return result;
}

TabletopSearchShelves splitPlateCupShelves(
  List<Product> plates,
  List<Product> cups, {
  Iterable<Product> exclude = const [],
}) {
  final plateRow = uniqueShelfProducts(plates, exclude: exclude);
  final cupRow = uniqueShelfProducts(cups, exclude: [...exclude, ...plateRow]);
  return TabletopSearchShelves(plates: plateRow, cups: cupRow);
}

const _platesHomeAisle = KitchenAisle(
  id: 'tabletop',
  title: 'Plates',
  icon: '🍽️',
  accentArgb: 0xFFB7A99A,
);

const _cupsHomeAisle = KitchenAisle(
  id: 'tabletop',
  title: 'Cups',
  icon: '☕',
  accentArgb: 0xFFB7A99A,
);

const _aisleSearchSeeds = <String, String>{
  'cookware': 'saucepan',
  'stainless-clad': 'stainless clad',
  'carbon-steel': 'carbon steel',
  'cast-iron': 'cast iron',
  'non-stick': 'non-stick',
  'cookware-accessories': 'spatula',
  'small-appliances': 'blender',
  'tabletop': 'dinner plate',
  'countertops-sinks': 'kitchen faucet',
  'organization': 'spice',
};

KitchenHomeShelf? _shelfFor({
  required String id,
  required KitchenAisle aisle,
  required List<Product> products,
  String? seeMorePath,
}) {
  if (products.isEmpty) return null;
  return KitchenHomeShelf(
    id: id,
    aisle: aisle,
    products: products,
    seeMorePath: seeMorePath,
  );
}

/// Pinned aisles, plates, cups, then packed remaining aisles — no reused photo.
List<KitchenHomeShelf> assignKitchenHomeShelves({
  required Map<String, List<Product>> aisleProducts,
  required List<Product> plates,
  required List<Product> cups,
}) {
  final claimed = <Product>[];
  final rows = <KitchenHomeShelf>[];

  void add(KitchenHomeShelf? shelf) {
    if (shelf == null) return;
    claimed.addAll(shelf.products);
    rows.add(shelf);
  }

  for (final aisle in kitchenHomePinnedAisles()) {
    add(_shelfFor(
      id: aisle.id,
      aisle: aisle,
      products: uniqueShelfProducts(
        aisleProducts[aisle.id] ?? const [],
        exclude: claimed,
      ),
    ));
  }

  final tabletop = splitPlateCupShelves(plates, cups, exclude: claimed);
  add(_shelfFor(
    id: 'plates',
    aisle: _platesHomeAisle,
    products: tabletop.plates,
    seeMorePath: '/kitchen/search?q=plates',
  ));
  add(_shelfFor(
    id: 'cups',
    aisle: _cupsHomeAisle,
    products: tabletop.cups,
    seeMorePath: '/kitchen/search?q=cups',
  ));

  for (final aisle in kitchenHomePackedAisles()) {
    add(_shelfFor(
      id: aisle.id,
      aisle: aisle,
      products: uniqueShelfProducts(
        aisleProducts[aisle.id] ?? const [],
        exclude: claimed,
      ),
    ));
  }

  return rows;
}

List<Product> _aisleMatches(List<Product> products, String aisleId) => [
      for (final product in products)
        if (product.image.isNotEmpty && aisleIdFromProductId(product.id) == aisleId)
          product,
    ];

final kitchenHomeShelvesProvider =
    FutureProvider<List<KitchenHomeShelf>>((ref) async {
  final api = ref.read(catalogApiClientProvider);
  final aisleIds = [
    ...kitchenHomePinnedAisleIds,
    ...kitchenHomePackedAisles().map((aisle) => aisle.id),
  ];
  final pages = await Future.wait([
    for (final id in aisleIds)
      api.fetchProductsPage(shop: 'kitchen', aisle: id, pageSize: 24),
    api.fetchProductsPage(
        shop: 'kitchen', aisle: 'tabletop', query: 'plates', pageSize: 24),
    api.fetchProductsPage(
        shop: 'kitchen', aisle: 'tabletop', query: 'cups', pageSize: 24),
  ]);

  final aisleProducts = <String, List<Product>>{};
  for (var i = 0; i < aisleIds.length; i++) {
    final id = aisleIds[i];
    var matched = _aisleMatches(pages[i].products, id);
    if (matched.isEmpty) {
      final seed = _aisleSearchSeeds[id];
      if (seed != null) {
        final fallback = await api.fetchProductsPage(query: seed, pageSize: 24);
        matched = _aisleMatches(fallback.products, id);
      }
    }
    aisleProducts[id] = matched;
  }

  return assignKitchenHomeShelves(
    aisleProducts: aisleProducts,
    plates: pages[aisleIds.length].products,
    cups: pages[aisleIds.length + 1].products,
  );
});

final platesCupsShelvesProvider =
    FutureProvider<TabletopSearchShelves>((ref) async {
  final rows = await ref.watch(kitchenHomeShelvesProvider.future);
  return TabletopSearchShelves(
    plates: [
      for (final row in rows)
        if (row.id == 'plates') ...row.products,
    ],
    cups: [
      for (final row in rows)
        if (row.id == 'cups') ...row.products,
    ],
  );
});
