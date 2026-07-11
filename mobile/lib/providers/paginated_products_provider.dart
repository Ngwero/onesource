import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/product.dart';
import '../services/api_client.dart';

/// Identifies a paginated product feed (optional category filter).
class ProductsQuery {
  const ProductsQuery({this.categoryId});

  final String? categoryId;

  @override
  bool operator ==(Object other) =>
      identical(this, other) || other is ProductsQuery && other.categoryId == categoryId;

  @override
  int get hashCode => categoryId.hashCode;
}

class PaginatedProductsState {
  const PaginatedProductsState({
    this.items = const [],
    this.total = 0,
    this.isInitialLoading = false,
    this.isLoadingMore = false,
    this.hasMore = true,
    this.error,
  });

  final List<Product> items;
  final int total;
  final bool isInitialLoading;
  final bool isLoadingMore;
  final bool hasMore;
  final Object? error;

  PaginatedProductsState copyWith({
    List<Product>? items,
    int? total,
    bool? isInitialLoading,
    bool? isLoadingMore,
    bool? hasMore,
    Object? error,
    bool clearError = false,
  }) {
    return PaginatedProductsState(
      items: items ?? this.items,
      total: total ?? this.total,
      isInitialLoading: isInitialLoading ?? this.isInitialLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      hasMore: hasMore ?? this.hasMore,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class PaginatedProductsNotifier extends FamilyNotifier<PaginatedProductsState, ProductsQuery> {
  static const pageSize = 48;

  int _loadedPage = -1;

  @override
  PaginatedProductsState build(ProductsQuery arg) {
    Future.microtask(loadFirst);
    return const PaginatedProductsState(isInitialLoading: true);
  }

  Future<void> loadFirst() async {
    _loadedPage = -1;
    state = const PaginatedProductsState(isInitialLoading: true);
    await _fetchPage(0, replace: true);
  }

  Future<void> refresh() => loadFirst();

  Future<void> loadMore() async {
    if (state.isInitialLoading || state.isLoadingMore || !state.hasMore) return;
    state = state.copyWith(isLoadingMore: true, clearError: true);
    await _fetchPage(_loadedPage + 1, replace: false);
  }

  Future<void> _fetchPage(int page, {required bool replace}) async {
    try {
      final result = await apiClientProvider.fetchProductsPage(
        category: arg.categoryId,
        page: page,
        pageSize: pageSize,
      );
      _loadedPage = page;
      final merged = replace ? result.products : _mergeProducts(state.items, result.products);
      state = PaginatedProductsState(
        items: merged,
        total: result.total,
        isInitialLoading: false,
        isLoadingMore: false,
        hasMore: result.hasMore,
      );
    } catch (e) {
      state = state.copyWith(
        isInitialLoading: false,
        isLoadingMore: false,
        error: e,
      );
    }
  }

  List<Product> _mergeProducts(List<Product> existing, List<Product> incoming) {
    final seen = existing.map((p) => p.id).toSet();
    final merged = [...existing];
    for (final product in incoming) {
      if (seen.add(product.id)) merged.add(product);
    }
    return merged;
  }
}

final paginatedProductsProvider =
    NotifierProvider.family<PaginatedProductsNotifier, PaginatedProductsState, ProductsQuery>(
  PaginatedProductsNotifier.new,
);
