import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:onesource_mobile/models/product.dart';
import 'package:onesource_mobile/providers/search_provider.dart';
import 'package:onesource_mobile/providers/products_provider.dart';
import 'package:onesource_mobile/services/api_client.dart';

class SearchApi extends ApiClient {
  final requests = <({String? query, String? shop, int page})>[];
  final pending = <Completer<ProductsPageResult>>[];
  @override
  Future<ProductsPageResult> fetchProductsPage(
      {String? category,
      String? query,
      int page = 0,
      int pageSize = 24,
      String? shop,
      String? aisle,
      bool sale = false,
      bool prime = false,
      String? sort}) {
    requests.add((query: query, shop: shop, page: page));
    final response = Completer<ProductsPageResult>();
    pending.add(response);
    return response.future;
  }
}

ProductsPageResult pageFor(String title) => ProductsPageResult(products: [
      Product.fromJson({'id': 'kitchen-tabletop-$title', 'title': title}),
    ], total: 1, page: 0, pageSize: 48, serverHasMore: false);

void main() {
  late SearchApi api;
  late ProviderContainer container;
  setUp(() {
    api = SearchApi();
    container = ProviderContainer(overrides: [
      searchApiProvider.overrideWithValue(api),
      categoriesProvider.overrideWith((ref) async => []),
    ]);
    container.read(searchShopProvider.notifier).state = 'kitchen';
  });
  tearDown(() => container.dispose());

  test('search requests a matching page without waiting for a full catalogue',
      () async {
    container.read(searchProvider.notifier).setQuery('plates');
    await Future<void>.delayed(const Duration(milliseconds: 320));
    expect(api.requests, [(query: 'plates', shop: 'kitchen', page: 0)]);
    api.pending.single.complete(pageFor('Dinner Plate'));
    await Future<void>.delayed(Duration.zero);
    expect(container.read(searchProvider).results.single.title, 'Dinner Plate');
    expect(container.read(searchProvider).isLoading, false);
  });

  test('a stale response cannot replace a newer query', () async {
    final search = container.read(searchProvider.notifier);
    search.setQuery('plates');
    await Future<void>.delayed(const Duration(milliseconds: 320));
    search.setQuery('bowls');
    await Future<void>.delayed(const Duration(milliseconds: 320));
    api.pending[1].complete(pageFor('Soup Bowl'));
    await Future<void>.delayed(Duration.zero);
    api.pending[0].complete(pageFor('Dinner Plate'));
    await Future<void>.delayed(Duration.zero);
    expect(container.read(searchProvider).query, 'bowls');
    expect(container.read(searchProvider).results.single.title, 'Soup Bowl');
  });

  test('a failed search reports an error rather than showing no matches',
      () async {
    container.read(searchProvider.notifier).setQuery('plates');
    await Future<void>.delayed(const Duration(milliseconds: 320));
    api.pending.single.completeError(Exception('offline'));
    await Future<void>.delayed(Duration.zero);
    expect(container.read(searchProvider).error, isNotNull);
    expect(container.read(searchProvider).isLoading, false);
  });
}
