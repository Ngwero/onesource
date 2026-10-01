import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/product.dart';
import '../services/api_client.dart';

/// First products of one cosmetics aisle, for the home rows.
final cosmeticsAisleRowProvider =
    FutureProvider.family<ProductsPageResult, String>((ref, aisleId) {
  ref.keepAlive();
  return apiClientProvider.fetchProductsPage(
    shop: 'cosmetics',
    aisle: aisleId,
    page: 0,
    pageSize: 14,
  );
});

/// Total number of cosmetics products (for headings).
final cosmeticsTotalProvider = FutureProvider<int>((ref) async {
  ref.keepAlive();
  final page = await apiClientProvider.fetchProductsPage(shop: 'cosmetics', pageSize: 1);
  return page.total;
});

/// Deals across the whole cosmetics shop (items with a list price above price).
final cosmeticsOffersProvider = FutureProvider<List<Product>>((ref) async {
  ref.keepAlive();
  final page = await apiClientProvider.fetchProductsPage(shop: 'cosmetics', pageSize: 96);
  return page.products
      .where((p) => p.originalPrice != null && p.originalPrice! > p.price)
      .take(14)
      .toList();
});
