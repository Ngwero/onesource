import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/product.dart';
import '../services/api_client.dart';
import 'kitchen_catalog_provider.dart';

/// Full in-stock catalog for client-side search (paginated fetch).
/// [shop] scopes to `fresh` or `kitchen` so one shop never floods the other.
final searchCatalogProvider = FutureProvider.family<List<Product>, String?>((ref, shop) async {
  ref.keepAlive();

  // Kitchen uses the progressive notifier (fast first paint + parallel pages).
  if (shop == 'kitchen') {
    ref.watch(kitchenCatalogNotifierProvider);
    await ref.read(kitchenCatalogNotifierProvider.notifier).completed;
    return ref.read(kitchenCatalogNotifierProvider).products;
  }

  final all = <Product>[];
  var page = 0;
  const pageSize = 200;
  const maxPages = 25;
  var total = 1;

  while (all.length < total && page < maxPages) {
    try {
      final result = await apiClientProvider.fetchProductsPage(
        page: page,
        pageSize: pageSize,
        shop: shop,
      );
      all.addAll(result.products);
      total = result.total;
      if (result.products.isEmpty) break;
      page++;
    } catch (e) {
      if (all.isNotEmpty) break;
      rethrow;
    }
  }

  return all;
});

/// Default produce catalog (back-compat for call sites that don't pass shop).
final produceCatalogProvider = FutureProvider<List<Product>>((ref) {
  return ref.watch(searchCatalogProvider('fresh').future);
});

final kitchenSearchCatalogProvider = FutureProvider<List<Product>>((ref) {
  return ref.watch(searchCatalogProvider('kitchen').future);
});
