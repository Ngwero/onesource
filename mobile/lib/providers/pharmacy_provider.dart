import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/product.dart';
import '../services/api_client.dart';

/// First products of one pharmacy aisle, for the home rows.
final pharmacyAisleRowProvider =
    FutureProvider.family<ProductsPageResult, String>((ref, aisleId) {
  ref.keepAlive();
  return apiClientProvider.fetchProductsPage(
    shop: 'pharmacy',
    aisle: aisleId,
    sort: 'top',
    page: 0,
    pageSize: 14,
  );
});

/// Deals across the pharmacy shop (items with a list price above the price).
final pharmacyOffersProvider = FutureProvider<List<Product>>((ref) async {
  ref.keepAlive();
  final page = await apiClientProvider.fetchProductsPage(
    shop: 'pharmacy',
    sale: true,
    pageSize: 14,
  );
  return page.products;
});
