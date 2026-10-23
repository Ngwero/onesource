import 'dart:math' as math;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/cosmetics.dart';
import '../data/kitchen_ware.dart';
import '../data/pharmacy.dart';
import '../services/api_client.dart';
import 'paginated_products_provider.dart';
import 'products_provider.dart';

const minimumCategoryProducts = 10;

/// Use scoped server totals, not the number of products on a loaded page.
/// Small previews also supply the kitchen category shelves.
final categoryAvailabilityProvider =
    FutureProvider.family<Map<String, ProductsPageResult>, String>(
        (ref, shop) async {
  final api = ref.watch(catalogApiClientProvider);
  final List<String> ids;
  switch (shop) {
    case 'cosmetics':
      ids = cosmeticsAisles.map((aisle) => aisle.id).toList();
    case 'kitchen':
      ids = kitchenVisibleAisles().map((aisle) => aisle.id).toList();
    case 'pharmacy':
      ids = pharmacyAisles.map((aisle) => aisle.id).toList();
    default:
      final categories = await ref.watch(categoriesProvider.future);
      ids = categories
          .where((category) => !const {
                kitchenWareCategoryId,
                'kitchen-furniture',
                'cosmetics',
                'pharmacy',
              }.contains(category.id))
          .map((category) => category.id)
          .toList();
  }

  final pages = <String, ProductsPageResult>{};
  var next = 0;
  // Avoid sending one simultaneous request for every aisle on mobile data.
  Future<void> worker() async {
    while (next < ids.length) {
      final id = ids[next++];
      final page = await api.fetchProductsPage(
        shop: shop,
        category: shop == 'fresh' ? id : null,
        aisle: shop == 'fresh' ? null : id,
        pageSize: shop == 'kitchen' ? 4 : 1,
      );
      if (page.total >= minimumCategoryProducts) pages[id] = page;
    }
  }

  await Future.wait(List.generate(math.min(4, ids.length), (_) => worker()));
  return pages;
});
