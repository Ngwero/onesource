import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/product.dart';
import '../services/api_client.dart';

/// Priority category IDs seeded for Fresh home aisle rows (chicken, meat, etc.).
const homeAisleSeedCategories = <String>[
  'fresh-fruits',
  'poultry-products',
  'fresh-vegetables',
  'fish-and-aquaculture',
  'chillies-and-peppers',
  'livestock-products',
  'herbs-and-spices',
  'dairy-products',
  'roots-and-tubers',
  'legumes-and-pulses',
  'oilseeds-and-nuts',
  'cereals-and-grains',
  'coffee-tea-cocoa',
];

const _titleSeeds = <String>[
  'chicken',
  'beef',
  'goat',
  'fish',
  'mango',
  'banana',
  'tomato',
  'onion',
  'egg',
];

/// Loads a diversified product pool so home aisle rows (meat, chicken, …)
/// appear even when the main fresh feed is produce-heavy.
final homeAisleCatalogProvider = FutureProvider<List<Product>>((ref) async {
  ref.keepAlive();
  final byId = <String, Product>{};

  Future<void> absorb(Future<List<Product>> future) async {
    try {
      for (final p in await future) {
        if (p.inStock) byId[p.id] = p;
      }
    } catch (_) {}
  }

  await Future.wait([
    ...homeAisleSeedCategories.map(
      (id) => absorb(
        apiClientProvider
            .fetchProductsPage(category: id, page: 0, pageSize: 24)
            .then((r) => r.products),
      ),
    ),
    ..._titleSeeds.map(
      (q) => absorb(
        apiClientProvider
            .fetchProductsPage(query: q, page: 0, pageSize: 16)
            .then((r) => r.products),
      ),
    ),
  ]);

  return byId.values.toList(growable: false);
});

List<Product> mergeProductPools(List<Product> primary, List<Product> extra) {
  if (extra.isEmpty) return primary;
  final byId = <String, Product>{for (final p in primary) p.id: p};
  for (final p in extra) {
    byId.putIfAbsent(p.id, () => p);
  }
  return byId.values.toList(growable: false);
}
