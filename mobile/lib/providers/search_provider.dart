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

class SearchState {
  const SearchState({
    this.query = '',
    this.results = const [],
    this.suggestions = const [],
    this.isLoading = false,
    this.error,
    this.total = 0,
  });

  final String query;
  final List<Product> results;
  final List<String> suggestions;
  final bool isLoading;
  final Object? error;
  final int total;

  SearchState copyWith({
    String? query,
    List<Product>? results,
    List<String>? suggestions,
    bool? isLoading,
    Object? error,
    int? total,
    bool clearError = false,
  }) {
    return SearchState(
      query: query ?? this.query,
      results: results ?? this.results,
      suggestions: suggestions ?? this.suggestions,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      total: total ?? this.total,
    );
  }
}

class SearchNotifier extends Notifier<SearchState> {
  Timer? _debounce;
  int _requestId = 0;

  @override
  SearchState build() {
    ref.onDispose(() => _debounce?.cancel());
    return SearchState(suggestions: _defaultSuggestions());
  }

  void setQuery(String raw) {
    final query = raw.trim();
    _debounce?.cancel();

    if (query.isEmpty) {
      state = SearchState(suggestions: _defaultSuggestions());
      return;
    }

    state = state.copyWith(query: query, isLoading: true, clearError: true);

    if (query.length < 2) {
      state = state.copyWith(
        query: query,
        results: const [],
        isLoading: false,
        suggestions: _matchingSuggestions(query),
        total: 0,
      );
      return;
    }

    _debounce = Timer(const Duration(milliseconds: 280), () => _runSearch(query));
  }

  Future<void> _runSearch(String query) async {
    final id = ++_requestId;
    try {
      final catalog = await ref.read(searchCatalogProvider.future);
      if (id != _requestId) return;

      var results = filterAndRankProducts(catalog, query);

      // Merge any extra API hits (when server search is deployed).
      try {
        final page = await apiClientProvider.fetchProductsPage(
          query: query,
          page: 0,
          pageSize: 80,
        );
        if (id != _requestId) return;
        final seen = results.map((p) => p.id).toSet();
        for (final p in page.products) {
          if (seen.add(p.id) && productMatchesSearch(p, query)) {
            results.add(p);
          }
        }
        results = rankSearchResults(results, query);
      } catch (_) {}

      state = state.copyWith(
        query: query,
        results: results.take(60).toList(),
        suggestions: _matchingSuggestions(query),
        isLoading: false,
        total: results.length,
        clearError: true,
      );
    } catch (e) {
      if (id != _requestId) return;
      state = state.copyWith(isLoading: false, error: e);
    }
  }

  List<String> _defaultSuggestions() => popularSearchTerms;

  List<String> _matchingSuggestions(String query) {
    final q = query.toLowerCase();
    final fromPopular = popularSearchTerms
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
    state = SearchState(suggestions: _defaultSuggestions());
  }
}

final searchProvider = NotifierProvider<SearchNotifier, SearchState>(SearchNotifier.new);
