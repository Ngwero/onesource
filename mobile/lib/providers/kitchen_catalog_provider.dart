import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/kitchen_ware.dart';
import '../models/product.dart';
import '../services/api_client.dart';
import '../utils/kitchen_mode.dart';

class KitchenCatalogState {
  const KitchenCatalogState({
    this.products = const [],
    this.isInitialLoading = false,
    this.isLoadingMore = false,
    this.hasMore = true,
    this.error,
  });

  final List<Product> products;
  final bool isInitialLoading;
  final bool isLoadingMore;
  final bool hasMore;
  final Object? error;

  KitchenCatalogState copyWith({
    List<Product>? products,
    bool? isInitialLoading,
    bool? isLoadingMore,
    bool? hasMore,
    Object? error,
    bool clearError = false,
  }) {
    return KitchenCatalogState(
      products: products ?? this.products,
      isInitialLoading: isInitialLoading ?? this.isInitialLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      hasMore: hasMore ?? this.hasMore,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

/// Progressive kitchen catalogue — first paint pulls every aisle, then grows gently.
class KitchenCatalogNotifier extends Notifier<KitchenCatalogState> {
  static const _pageSize = 48;
  static const _parallel = 2;
  static const _maxPages = 80;
  /// Stop growing the in-memory list past this to avoid OOM aborts on device.
  static const _softCap = 600;

  /// Title seeds used when production API has no `aisle=` filter yet.
  static const _aisleSearchSeeds = <String, String>{
    'cookware': 'saucepan',
    'stainless-clad': 'stainless clad',
    'carbon-steel': 'carbon steel',
    'cast-iron': 'cast iron',
    'non-stick': 'non-stick',
    'cookware-accessories': 'spatula',
    'tabletop': 'dinner plate',
    'small-furniture': 'wall shelf',
    'extractor-hoods': 'extractor hood',
    'countertops-sinks': 'kitchen faucet',
    'organization': 'spice',
  };

  /// Pages known to hold non-tabletop aisles in the live kitchen feed.
  static const _probePages = <int>[0, 45, 90, 120, 140, 160];

  Completer<void>? _done;
  Future<void>? _inFlight;

  Future<void> get completed {
    final pending = _done;
    if (pending != null) return pending.future;
    return ensureLoaded();
  }

  @override
  KitchenCatalogState build() => const KitchenCatalogState();

  /// Start loading only when a kitchen screen needs it (not at app launch).
  Future<void> ensureLoaded() {
    if (state.products.isNotEmpty || state.isLoadingMore || state.isInitialLoading) {
      return _done?.future ?? Future.value();
    }
    return refresh();
  }

  Future<void> refresh({bool restart = true}) {
    final existing = _inFlight;
    if (existing != null && !restart) return existing;

    final run = _refreshBody(restart: restart);
    _inFlight = run;
    return run.whenComplete(() {
      if (identical(_inFlight, run)) _inFlight = null;
    });
  }

  void _addUnique(List<Product> into, Set<String> seen, Iterable<Product> batch) {
    for (final product in batch) {
      if (!isKitchenProduct(product)) continue;
      if (seen.add(product.id)) into.add(product);
    }
  }

  /// Pull samples from every aisle so home isn't just glasses/tabletop.
  Future<List<Product>> _seedAcrossAisles() async {
    final products = <Product>[];
    final seen = <String>{};

    // Production still ignores `aisle=` — title search is the reliable path.
    // Only trust aisle filter when a non-tabletop aisle (cookware) returns hits.
    final aislePages = await Future.wait(
      kitchenWareAisles.map(
        (aisle) => apiClientProvider.fetchProductsPage(
          shop: 'kitchen',
          aisle: aisle.id,
          page: 0,
          pageSize: 20,
        ),
      ),
    );

    var distinctAisles = 0;
    for (var i = 0; i < kitchenWareAisles.length; i++) {
      final expected = kitchenWareAisles[i].id;
      final matched = aislePages[i]
          .products
          .where((p) => aisleIdFromProductId(p.id) == expected)
          .toList();
      if (matched.isNotEmpty) {
        distinctAisles++;
        _addUnique(products, seen, matched);
      }
    }
    final aisleFilterOk = distinctAisles >= 4;

    if (!aisleFilterOk) {
      // Drop tabletop-only noise from ignored aisle= responses before seeding.
      products.clear();
      seen.clear();

      final probes = await Future.wait(
        _probePages.map(
          (page) => apiClientProvider.fetchProductsPage(
            shop: 'kitchen',
            page: page,
            pageSize: _pageSize,
          ),
        ),
      );
      for (final page in probes) {
        _addUnique(products, seen, page.products);
      }

      final searches = await Future.wait(
        _aisleSearchSeeds.entries.map((entry) async {
          final result = await apiClientProvider.fetchProductsPage(
            query: entry.value,
            page: 0,
            pageSize: 24,
          );
          return result.products
              .where((p) => aisleIdFromProductId(p.id) == entry.key);
        }),
      );
      for (final batch in searches) {
        _addUnique(products, seen, batch);
      }
    }

    return sortKitchenWithSaucepansFirst(products);
  }

  Future<void> _refreshBody({required bool restart}) async {
    if (restart || _done == null || _done!.isCompleted) {
      _done = Completer<void>();
    }
    final done = _done!;
    state = const KitchenCatalogState(isInitialLoading: true);
    try {
      var products = await _seedAcrossAisles();
      final seen = products.map((p) => p.id).toSet();

      state = KitchenCatalogState(
        products: List<Product>.unmodifiable(products),
        isInitialLoading: false,
        isLoadingMore: products.length < _softCap,
        hasMore: products.length < _softCap,
      );

      if (!state.hasMore) {
        if (!done.isCompleted) done.complete();
        return;
      }

      // Grow with newer kitchen pages, but keep the diverse seed.
      var page = 0;
      var batchesSinceNotify = 0;
      while (page < _maxPages && state.hasMore && products.length < _softCap) {
        final batchPages = <int>[
          for (var i = 0; i < _parallel && page + i < _maxPages; i++) page + i,
        ];
        final results = await Future.wait(
          batchPages.map(
            (p) => apiClientProvider.fetchProductsPage(
              shop: 'kitchen',
              page: p,
              pageSize: _pageSize,
            ),
          ),
        );

        var hitEmpty = false;
        for (final result in results) {
          if (result.products.isEmpty) {
            hitEmpty = true;
            break;
          }
          _addUnique(products, seen, result.products);
        }

        page += batchPages.length;
        batchesSinceNotify++;

        final atCap = products.length >= _softCap;
        final hasMore = !hitEmpty && !atCap;

        if (batchesSinceNotify >= 2 || !hasMore) {
          products = sortKitchenWithSaucepansFirst(products);
          state = KitchenCatalogState(
            products: List<Product>.unmodifiable(products),
            isInitialLoading: false,
            isLoadingMore: hasMore,
            hasMore: hasMore,
          );
          batchesSinceNotify = 0;
        } else {
          state = state.copyWith(isLoadingMore: hasMore, hasMore: hasMore);
        }
        if (!hasMore) break;

        await Future<void>.delayed(const Duration(milliseconds: 40));
      }

      if (batchesSinceNotify > 0) {
        products = sortKitchenWithSaucepansFirst(products);
        state = KitchenCatalogState(
          products: List<Product>.unmodifiable(products),
          isInitialLoading: false,
          isLoadingMore: false,
          hasMore: false,
        );
      }
      if (!done.isCompleted) done.complete();
    } catch (e) {
      if (state.products.isEmpty) {
        state = KitchenCatalogState(isInitialLoading: false, error: e);
      } else {
        state = state.copyWith(isLoadingMore: false, hasMore: false);
      }
      if (!done.isCompleted) done.complete();
    }
  }
}

final kitchenCatalogNotifierProvider =
    NotifierProvider<KitchenCatalogNotifier, KitchenCatalogState>(
  KitchenCatalogNotifier.new,
);

/// Async view of kitchen products — emits as soon as the first page arrives.
final kitchenCatalogProvider = Provider<AsyncValue<List<Product>>>((ref) {
  // Lazy-start when any kitchen UI watches this (not at app cold start).
  // Capture notifier now — do not call ref.read inside the microtask (Riverpod
  // asserts if a dependency changed before the provider rebuilds).
  final notifier = ref.read(kitchenCatalogNotifierProvider.notifier);
  Future.microtask(notifier.ensureLoaded);

  final s = ref.watch(kitchenCatalogNotifierProvider);
  if ((s.isInitialLoading || s.products.isEmpty) &&
      s.error == null &&
      !s.isLoadingMore &&
      s.products.isEmpty) {
    // Brief moment before ensureLoaded flips isInitialLoading.
    return const AsyncValue.loading();
  }
  if (s.isInitialLoading && s.products.isEmpty) {
    return const AsyncValue.loading();
  }
  if (s.error != null && s.products.isEmpty) {
    return AsyncValue.error(s.error!, StackTrace.current);
  }
  return AsyncValue.data(s.products);
});

final kitchenCatalogLoadingMoreProvider = Provider<bool>((ref) {
  return ref.watch(kitchenCatalogNotifierProvider).isLoadingMore;
});

final kitchenAisleGroupsProvider = Provider<AsyncValue<List<KitchenAisleGroup>>>((ref) {
  return ref.watch(kitchenCatalogProvider).whenData((products) {
    return groupKitchenByAisle(products)
        .map(
          (g) => KitchenAisleGroup(
            aisle: g.aisle,
            products: g.products,
          ),
        )
        .where((g) => g.products.isNotEmpty)
        .toList();
  });
});

final kitchenAisleProductsProvider =
    Provider.family<AsyncValue<List<Product>>, String>((ref, aisleId) {
  return ref.watch(kitchenCatalogProvider).whenData((products) {
    return filterKitchenAisle(products, aisleId);
  });
});

final kitchenSaucepansProvider = Provider<AsyncValue<List<Product>>>((ref) {
  return ref.watch(kitchenCatalogProvider).whenData(filterSaucepans);
});

KitchenAisle? aisleMeta(String aisleId) => kitchenAisleById(aisleId);
