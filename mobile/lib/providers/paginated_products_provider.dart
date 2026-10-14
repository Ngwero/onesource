import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/product.dart';
import '../services/api_client.dart';

/// Identifies a paginated product feed.
class ProductsQuery {
  const ProductsQuery({
    this.categoryId,
    this.shop = 'fresh',
    this.aisle,
    this.sale = false,
    this.prime = false,
    this.sort,
  });

  final String? categoryId;

  /// `fresh` (default produce), `kitchen`, `cosmetics`, or null for unfiltered.
  final String? shop;

  /// Aisle within the kitchen or cosmetics shop.
  final String? aisle;

  /// Only products on sale (`original_price > price`), filtered server-side.
  final bool sale;

  /// Only Prime products, filtered server-side.
  final bool prime;

  /// Server sort: `newest` (default when null), `top`, `price-asc`, `price-desc`, `name`.
  final String? sort;

  ProductsQuery copyWith({bool? sale, bool? prime, String? sort, bool clearSort = false}) {
    return ProductsQuery(
      categoryId: categoryId,
      shop: shop,
      aisle: aisle,
      sale: sale ?? this.sale,
      prime: prime ?? this.prime,
      sort: clearSort ? null : (sort ?? this.sort),
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ProductsQuery &&
          other.categoryId == categoryId &&
          other.shop == shop &&
          other.aisle == aisle &&
          other.sale == sale &&
          other.prime == prime &&
          other.sort == sort;

  @override
  int get hashCode => Object.hash(categoryId, shop, aisle, sale, prime, sort);
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

  /// First-page error when [items] is empty; otherwise a failed next page.
  final Object? error;

  /// A next-page request failed; paging pauses until [PaginatedProductsNotifier.retry].
  bool get hasLoadMoreError => error != null && items.isNotEmpty;

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

  /// Pages fetched back-to-back in one [loadMore] when they add no new items
  /// (search relevance filtering or client-side shop filtering on older APIs).
  static const _maxEmptyPagesPerLoad = 4;

  int _loadedPage = -1;

  /// Bumped on every reset so responses for a superseded feed are dropped.
  int _generation = 0;

  @override
  PaginatedProductsState build(ProductsQuery arg) {
    Future.microtask(loadFirst);
    return const PaginatedProductsState(isInitialLoading: true);
  }

  Future<void> loadFirst() async {
    _loadedPage = -1;
    final gen = ++_generation;
    state = const PaginatedProductsState(isInitialLoading: true);
    await _fetchPage(0, replace: true, gen: gen);
  }

  Future<void> refresh() => loadFirst();

  /// Loads the next page. No-op while a request is in flight, at the end of
  /// the list, or after a failed page (use [retry] so errors don't loop).
  Future<void> loadMore() async {
    if (state.isInitialLoading || state.isLoadingMore || !state.hasMore) return;
    if (state.error != null) return;
    state = state.copyWith(isLoadingMore: true);
    await _fetchPage(_loadedPage + 1, replace: false, gen: _generation);
  }

  /// Retries after an error: the first page if nothing loaded, else the next page.
  Future<void> retry() async {
    if (state.items.isEmpty) return loadFirst();
    if (state.isLoadingMore) return;
    state = state.copyWith(clearError: true, isLoadingMore: true);
    await _fetchPage(_loadedPage + 1, replace: false, gen: _generation);
  }

  bool _matchesQuery(Product p) {
    if (arg.sale && !(p.originalPrice != null && p.originalPrice! > p.price)) return false;
    if (arg.prime && !p.prime) return false;
    return true;
  }

  Future<void> _fetchPage(int page, {required bool replace, required int gen}) async {
    try {
      var current = page;
      var items = replace ? const <Product>[] : state.items;
      var emptyPages = 0;
      while (true) {
        final result = await apiClientProvider.fetchProductsPage(
          category: arg.categoryId,
          shop: arg.shop,
          aisle: arg.aisle,
          sale: arg.sale,
          prime: arg.prime,
          sort: arg.sort,
          page: current,
          pageSize: pageSize,
        );
        if (gen != _generation) return;
        _loadedPage = current;
        final before = items.length;
        items = _mergeProducts(items, result.products.where(_matchesQuery));
        final added = items.length > before;
        if (!added && result.hasMore && emptyPages < _maxEmptyPagesPerLoad) {
          emptyPages++;
          current++;
          continue;
        }
        state = PaginatedProductsState(
          items: items,
          total: result.total,
          isInitialLoading: false,
          isLoadingMore: false,
          hasMore: result.hasMore,
        );
        return;
      }
    } catch (e) {
      if (gen != _generation) return;
      state = state.copyWith(
        isInitialLoading: false,
        isLoadingMore: false,
        error: e,
      );
    }
  }

  List<Product> _mergeProducts(List<Product> existing, Iterable<Product> incoming) {
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
