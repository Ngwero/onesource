import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:onesource_mobile/models/product.dart';
import 'package:onesource_mobile/providers/category_availability_provider.dart';
import 'package:onesource_mobile/providers/paginated_products_provider.dart';
import 'package:onesource_mobile/providers/products_provider.dart';
import 'package:onesource_mobile/services/api_client.dart';
import 'package:onesource_mobile/widgets/available_categories.dart';
import 'package:onesource_mobile/widgets/loading_view.dart';

class CategoryApi extends ApiClient {
  final calls = <({String? shop, String? category, String? aisle, int size})>[];
  int active = 0;
  int maxActive = 0;
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
  }) async {
    final index = calls.length;
    calls.add((shop: shop, category: category, aisle: aisle, size: pageSize));
    active++;
    if (active > maxActive) maxActive = active;
    await Future<void>.delayed(Duration.zero);
    active--;
    return ProductsPageResult(
      products: [
        Product.fromJson({'id': 'preview', 'price': 1000})
      ],
      total: [0, 9, 10, 11][index % 4],
      page: 0,
      pageSize: pageSize,
    );
  }
}

void main() {
  for (final shop in ['fresh', 'kitchen', 'cosmetics', 'pharmacy']) {
    test('$shop uses full totals, includes 10 and excludes fewer than 10',
        () async {
      final api = CategoryApi();
      final container = ProviderContainer(overrides: [
        catalogApiClientProvider.overrideWithValue(api),
        categoriesProvider.overrideWith((ref) async => [
              for (var i = 0; i < 8; i++)
                Category(id: 'fresh-$i', name: 'Category $i', icon: ''),
              const Category(id: 'cosmetics', name: 'Cosmetics', icon: ''),
            ]),
      ]);
      addTearDown(container.dispose);
      final result =
          await container.read(categoryAvailabilityProvider(shop).future);
      expect(api.maxActive, lessThanOrEqualTo(4));
      expect(api.calls.length, greaterThan(3));
      for (var i = 0; i < api.calls.length; i++) {
        final call = api.calls[i];
        final id = shop == 'fresh' ? call.category! : call.aisle!;
        expect(result.containsKey(id), i % 4 >= 2);
        expect(call.shop, shop);
        expect(shop == 'fresh' ? call.aisle : call.category, isNull);
        expect(call.size, shop == 'kitchen' ? 4 : 1);
      }
      expect(result.values.any((page) => page.total == 10), isTrue);
      expect(result.values.every((page) => page.products.length == 1), isTrue);
      if (shop == 'fresh') expect(api.calls.length, 8);
    });
  }

  testWidgets('category count failure offers retry and then shows results',
      (tester) async {
    var attempts = 0;
    final container = ProviderContainer(overrides: [
      categoryAvailabilityProvider('cosmetics').overrideWith((ref) async {
        attempts++;
        if (attempts == 1) throw Exception('Server unavailable');
        return {
          'popular': const ProductsPageResult(
              products: [], total: 10, page: 0, pageSize: 1)
        };
      }),
    ]);
    addTearDown(container.dispose);
    await tester.pumpWidget(UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
          home: Scaffold(
              body: AvailableCategories(
        shop: 'cosmetics',
        builder: (pages) => ListView(children: [Text(pages.keys.single)]),
      ))),
    ));
    await tester.pumpAndSettle();
    expect(find.byType(ErrorView), findsOneWidget);
    await tester.tap(find.byType(OutlinedButton));
    await tester.pumpAndSettle();
    expect(find.text('popular'), findsOneWidget);
    expect(attempts, 2);
    expect(tester.takeException(), isNull);
  });

  testWidgets('empty categories still allow pull to refresh', (tester) async {
    final container = ProviderContainer(overrides: [
      categoryAvailabilityProvider('fresh').overrideWith((ref) async => {}),
    ]);
    addTearDown(container.dispose);
    await tester.pumpWidget(UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
          home: Scaffold(
              body: AvailableCategories(
        shop: 'fresh',
        builder: (_) => const Text('should not appear'),
      ))),
    ));
    await tester.pumpAndSettle();
    expect(find.text('should not appear'), findsNothing);
    expect(find.byType(RefreshIndicator), findsOneWidget);
    expect(tester.widget<ListView>(find.byType(ListView)).physics,
        isA<AlwaysScrollableScrollPhysics>());
    expect(tester.takeException(), isNull);
  });
}
