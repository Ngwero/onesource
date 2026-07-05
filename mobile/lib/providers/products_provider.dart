import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/product.dart';
import '../services/api_client.dart';

final productsProvider = FutureProvider<List<Product>>((ref) async {
  return apiClientProvider.fetchProducts();
});

final categoriesProvider = FutureProvider<List<Category>>((ref) async {
  return apiClientProvider.fetchCategories();
});

final productProvider = FutureProvider.family<Product?, String>((ref, id) async {
  return apiClientProvider.fetchProductById(id);
});

final productsByCategoryProvider =
    FutureProvider.family<List<Product>, String?>((ref, categoryId) async {
  if (categoryId == null || categoryId.isEmpty) {
    return apiClientProvider.fetchProducts();
  }
  return apiClientProvider.fetchProducts(category: categoryId);
});

final searchProductsProvider =
    FutureProvider.family<List<Product>, String>((ref, query) async {
  if (query.trim().isEmpty) return [];
  return apiClientProvider.fetchProducts(query: query.trim());
});
