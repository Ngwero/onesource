import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/product.dart';
import '../services/api_client.dart';

/// Full in-stock catalog for client-side search (paginated fetch).
final searchCatalogProvider = FutureProvider<List<Product>>((ref) async {
  ref.keepAlive();
  final all = <Product>[];
  var page = 0;
  const pageSize = 500;
  var total = 1;

  while (all.length < total && page < 20) {
    final result = await apiClientProvider.fetchProductsPage(page: page, pageSize: pageSize);
    all.addAll(result.products);
    total = result.total;
    if (result.products.isEmpty) break;
    page++;
  }

  return all;
});
