import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:onesource_mobile/models/product.dart';
import 'package:onesource_mobile/providers/paginated_products_provider.dart';
import 'package:onesource_mobile/screens/cosmetics_home_screen.dart';
import 'package:onesource_mobile/services/api_client.dart';
import 'package:onesource_mobile/widgets/loading_view.dart';

Product product(String id) => Product.fromJson({
      'id': id,
      'title': id,
      'price': 1000,
      'details': {
        'source': 'manufacturer',
        'brand': 'Brand',
        'origin': 'Uganda',
        'temperature': 'Cool',
        'ingredients': 'Water',
        'allergens': ['Milk'],
        'allergenStatement': 'Contains milk',
        'howToUse': 'Apply',
        'storage': 'Keep cool',
        'care': 'Handle carefully',
        'warnings': ['External use'],
        'highlights': ['Gentle'],
        'suitableFor': ['Adults'],
        'ratingSource': 'reviews',
        'specs': [
          {'key': 'size', 'label': 'Size', 'value': '50 ml'}
        ],
      },
    });

class ControlledApi extends ApiClient {
  final pages = <int>[];
  final pending = <Completer<ProductsPageResult>>[];

  @override
  Future<ProductsPageResult> fetchProductsPage({
    String? category,
    String? query,
    int page = 0,
    int pageSize = 24,
    String? shop,
    String? aisle,
    bool sale = false,
    bool prime = false,
    String? sort,
  }) {
    pages.add(page);
    final request = Completer<ProductsPageResult>();
    pending.add(request);
    return request.future;
  }

  void complete(int index, String id) => pending[index].complete(
        ProductsPageResult(
            products: [product(id)],
            total: 10,
            page: pages[index],
            pageSize: 1,
            serverHasMore: true),
      );
}

class FailedCatalog extends PaginatedProductsNotifier {
  FailedCatalog(this.error);
  final Object error;
  int retries = 0;
  @override
  PaginatedProductsState build(ProductsQuery arg) =>
      PaginatedProductsState(error: error);
  @override
  Future<void> retry() async {
    retries++;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('product cache round trip preserves every detail and specification', () {
    final original = product('cached');
    final restored =
        Product.fromJson(jsonDecode(jsonEncode(original.toJson())));
    expect(restored.details.toJson(), original.details.toJson());
    expect(restored.details.brand, 'Brand');
    expect(restored.details.specs.single.value, '50 ml');
    expect(restored.details.warnings, ['External use']);
  });

  test('refresh blocks paging and ignores an older page response', () async {
    final api = ControlledApi();
    final container = ProviderContainer(overrides: [
      catalogApiClientProvider.overrideWithValue(api),
    ]);
    addTearDown(container.dispose);
    const query = ProductsQuery(pageSize: 1);
    final provider = paginatedProductsProvider(query);
    final notifier = container.read(provider.notifier);
    await Future<void>.delayed(Duration.zero);
    api.complete(0, 'initial');
    await Future<void>.delayed(Duration.zero);
    final oldPage = notifier.loadMore();
    final refresh = notifier.refresh();
    await notifier.loadMore();
    await notifier.retry();
    expect(api.pages, [0, 1, 0]);
    api.complete(2, 'fresh');
    await refresh;
    api.complete(1, 'stale');
    await oldPage;
    expect(container.read(provider).items.single.id, 'fresh');
    final next = notifier.loadMore();
    expect(api.pages.last, 1);
    api.complete(3, 'next');
    await next;
    expect(container.read(provider).items.map((p) => p.id), ['fresh', 'next']);
  });

  test('failed refresh retries page zero and replaces stale products',
      () async {
    final api = ControlledApi();
    final container = ProviderContainer(overrides: [
      catalogApiClientProvider.overrideWithValue(api),
    ]);
    addTearDown(container.dispose);
    final provider =
        paginatedProductsProvider(const ProductsQuery(pageSize: 1));
    final notifier = container.read(provider.notifier);
    await Future<void>.delayed(Duration.zero);
    api.complete(0, 'stale');
    await Future<void>.delayed(Duration.zero);
    final refresh = notifier.refresh();
    api.pending[1].completeError(Exception('offline'));
    await refresh;
    expect(container.read(provider).items.single.id, 'stale');
    final retry = notifier.retry();
    expect(api.pages, [0, 0, 0]);
    api.complete(2, 'fresh');
    await retry;
    expect(container.read(provider).items.single.id, 'fresh');
    expect(container.read(provider).error, isNull);
  });

  for (final error in [
    Exception('Server unavailable'),
    Exception('SocketException: Failed host lookup')
  ]) {
    testWidgets('cosmetics first-page error offers retry: $error',
        (tester) async {
      final notifier = FailedCatalog(error);
      await tester.pumpWidget(ProviderScope(
        overrides: [paginatedProductsProvider.overrideWith(() => notifier)],
        child: const MaterialApp(home: CosmeticsHomeScreen()),
      ));
      await tester.pump();
      expect(find.byType(ErrorView), findsOneWidget);
      final retry =
          find.byWidgetPredicate((widget) => widget is ButtonStyleButton);
      await tester.ensureVisible(retry);
      await tester.tap(retry);
      expect(notifier.retries, 1);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    });
  }
}
