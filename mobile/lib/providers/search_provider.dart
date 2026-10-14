import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/product.dart';
import '../services/api_client.dart';
import '../utils/search_match.dart';
import 'products_provider.dart';
import 'search_catalog_provider.dart';

const popularSearchTerms = [
  'Mango',
  'Mangoes',
  'Chicken',
  'Tomatoes',
  'Organic',
  'Beef',
  'Fish',
  'Eggs',
  'Rice',
  'Avocado',
  'Honey',
];

const popularKitchenSearchTerms = [
  'Pan',
  'Pot',
  'Knife',
  'Spatula',
  'Bowl',
  'Plate',
  'Whisk',
  'Cast iron',
  'Non-stick',
  'Lid',
];

const popularCosmeticsSearchTerms = [
  'Serum',
  'Sunscreen',
  'Moisturiser',
  'Lipstick',
  'Mascara',
  'Foundation',
  'Cleanser',
  'Perfume',
  'Gift set',
  'Hair oil',
];

/// Which shop the active search screen is querying.
final searchShopProvider = StateProvider<String>((ref) => 'fresh');

class SearchState {
  const SearchState({
    this.query = '',
    this.results = const [],
    this.suggestions = const [],
    this.isLoading = false,
    this.error,
    this.total = 0,
    this.hasMore = false,
    this.isLoadingMore = false,
    this.loadMoreError,
  });

  final String query;

  /// Results revealed so far (grows as the user scrolls).
  final List<Product> results;
  final List<String> suggestions;
  final bool isLoading;
  final Object? error;
  final int total;

  /// More matches are buffered locally or available from the server.
  final bool hasMore;
  final bool isLoadingMore;

  /// Last next-page request failed; paging pauses until [SearchNotifier.retryMore].
  final Object? loadMoreError;

  SearchState copyWith({
    String? query,
    List<Product>? results,
    List<String>? suggestions,
    bool? isLoading,
    Object? error,
    int? total,
    bool? hasMore,
    bool? isLoadingMore,
    Object? loadMoreError,
    bool clearError = false,
    bool clearLoadMoreError = false,
  }) {
    return SearchState(
      query: query ?? this.query,
      results: results ?? this.results,
      suggestions: suggestions ?? this.suggestions,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      total: total ?? this.total,
      hasMore: hasMore ?? this.hasMore,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      loadMoreError: clearLoadMoreError ? null : (loadMoreError ?? this.loadMoreError),
    );
  }
}

class SearchNotifier extends Notifier<SearchState> {
  static const pageSize = 48;

  /// Server pages fetched back-to-back in one [loadMore] when they add nothing new.
  static const _maxEmptyPagesPerLoad = 4;

  Timer? _debounce;
  int _requestId = 0;

  /// Every match found so far, ranked; [SearchState.results] reveals a prefix.
  List<Product> _pool = const [];
  Set<String> _poolIds = const {};
  int _visible = 0;
  int _serverPage = 0;
  bool _serverHasMore = false;

  void _resetPaging() {
    _pool = const [];
    _poolIds = const {};
    _visible = 0;
    _serverPage = 0;
    _serverHasMore = false;
  }

  bool get _hasMore => _visible < _pool.length || _serverHasMore;

  /// Appends server hits not already in the pool (keeps revealed order stable).
  bool _appendMatches(Iterable<Product> products, String query) {
    final added = <Product>[];
    for (final p in products) {
      if (!_poolIds.contains(p.id) && productMatchesSearch(p, query)) {
        added.add(p);
      }
    }
    if (added.isEmpty) return false;
    _pool = [..._pool, ...added];
    _poolIds = {..._poolIds, ...added.map((p) => p.id)};
    return true;
  }

  /// Only page the server when it reports `hasMore`; older APIs may ignore `q`
  /// and would otherwise walk the entire catalogue.
  static bool _canPageServer(ProductsPageResult page) => page.serverHasMore == true;

  @override
  SearchState build() {
    ref.onDispose(() => _debounce?.cancel());
    return SearchState(suggestions: _defaultSuggestions());
  }

  void setQuery(String raw) {
    final query = raw.trim();
    _debounce?.cancel();
    _requestId++;

    if (query.isEmpty) {
      _requestId++;
      _resetPaging();
      state = SearchState(suggestions: _defaultSuggestions());
      return;
    }

    state = state.copyWith(
      query: query,
      isLoading: true,
      isLoadingMore: false,
      clearError: true,
      clearLoadMoreError: true,
    );

    if (query.length < 2) {
      _requestId++;
      _resetPaging();
      state = state.copyWith(
        query: query,
        results: const [],
        isLoading: false,
        suggestions: _matchingSuggestions(query),
        total: 0,
        hasMore: false,
      );
      return;
    }

    _debounce = Timer(const Duration(milliseconds: 280), () => _runSearch(query));
  }

  Future<void> _runSearch(String query) async {
    final id = ++_requestId;
    try {
      final shop = ref.read(searchShopProvider);
      final catalog = await ref.read(searchCatalogProvider(shop).future);
      if (id != _requestId) return;

      var results = filterAndRankProducts(catalog, query);
      var serverHasMore = false;

      // Merge any extra API hits (when server search is deployed).
      try {
        final page = await apiClientProvider.fetchProductsPage(
          query: query,
          shop: shop,
          page: 0,
          pageSize: pageSize,
        );
        if (id != _requestId) return;
        final seen = results.map((p) => p.id).toSet();
        for (final p in page.products) {
          if (seen.add(p.id) && productMatchesSearch(p, query)) {
            results.add(p);
          }
        }
        results = rankSearchResults(results, query);
        serverHasMore = _canPageServer(page);
      } catch (_) {}
      if (id != _requestId) return;

      _pool = results;
      _poolIds = results.map((p) => p.id).toSet();
      _visible = results.length < pageSize ? results.length : pageSize;
      _serverPage = 0;
      _serverHasMore = serverHasMore;

      state = state.copyWith(
        query: query,
        results: _pool.take(_visible).toList(),
        suggestions: _matchingSuggestions(query),
        isLoading: false,
        total: _pool.length,
        hasMore: _hasMore,
        isLoadingMore: false,
        clearError: true,
        clearLoadMoreError: true,
      );
    } catch (e) {
      if (id != _requestId) return;
      state = state.copyWith(isLoading: false, error: e);
    }
  }

  /// Reveals the next batch of buffered matches, or fetches the next server page.
  Future<void> loadMore() async {
    if (state.isLoading || state.isLoadingMore || state.loadMoreError != null) return;
    if (state.query.length < 2 || !_hasMore) return;

    if (_visible < _pool.length) {
      _visible = (_visible + pageSize).clamp(0, _pool.length);
      state = state.copyWith(
        results: _pool.take(_visible).toList(),
        total: _pool.length,
        hasMore: _hasMore,
      );
      return;
    }

    final id = _requestId;
    final query = state.query;
    final shop = ref.read(searchShopProvider);
    state = state.copyWith(isLoadingMore: true);
    try {
      var emptyPages = 0;
      while (true) {
        final page = await apiClientProvider.fetchProductsPage(
          query: query,
          shop: shop,
          page: _serverPage + 1,
          pageSize: pageSize,
        );
        if (id != _requestId) return;
        _serverPage++;
        _serverHasMore = _canPageServer(page);
        final added = _appendMatches(page.products, query);
        if (!added && _serverHasMore && emptyPages < _maxEmptyPagesPerLoad) {
          emptyPages++;
          continue;
        }
        break;
      }
      _visible = (_visible + pageSize).clamp(0, _pool.length);
      state = state.copyWith(
        results: _pool.take(_visible).toList(),
        total: _pool.length,
        hasMore: _hasMore,
        isLoadingMore: false,
      );
    } catch (e) {
      if (id != _requestId) return;
      state = state.copyWith(isLoadingMore: false, loadMoreError: e);
    }
  }

  Future<void> retryMore() async {
    if (state.loadMoreError == null) return;
    state = state.copyWith(clearLoadMoreError: true);
    await loadMore();
  }

  List<String> _defaultSuggestions() {
    final shop = ref.read(searchShopProvider);
    return switch (shop) {
      'kitchen' => popularKitchenSearchTerms,
      'cosmetics' => popularCosmeticsSearchTerms,
      _ => popularSearchTerms,
    };
  }

  List<String> _matchingSuggestions(String query) {
    final q = query.toLowerCase();
    final popular = _defaultSuggestions();
    final fromPopular = popular
        .where((t) {
          final tl = t.toLowerCase();
          return tl.contains(q) ||
              q.contains(tl) ||
              queryVariants(q).any((v) => tl.contains(v));
        })
        .take(6);

    final categories = ref.read(categoriesProvider).valueOrNull ?? [];
    final fromCategories = categories
        .where((c) => c.name.toLowerCase().contains(q))
        .map((c) => c.name)
        .take(4);

    return {...fromPopular, ...fromCategories}.take(8).toList();
  }

  void clear() {
    _debounce?.cancel();
    _requestId++;
    _resetPaging();
    state = SearchState(suggestions: _defaultSuggestions());
  }
}

final searchProvider = NotifierProvider<SearchNotifier, SearchState>(SearchNotifier.new);
