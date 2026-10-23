import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/product.dart';
import 'paginated_products_provider.dart';

class TabletopSearchShelves {
  const TabletopSearchShelves({required this.plates, required this.cups});

  final List<Product> plates;
  final List<Product> cups;

  List<Product> get featured => [...plates, ...cups];
}

List<Product> uniqueShelfProducts(
  List<Product> products, {
  Iterable<Product> exclude = const [],
}) {
  final result = <Product>[];
  final ids = <String>{};
  final images = <String>{};
  for (final product in exclude) {
    if (product.id.isNotEmpty) ids.add(product.id);
    if (product.image.isNotEmpty) images.add(product.image);
  }
  for (final product in products) {
    if (product.image.isEmpty ||
        ids.contains(product.id) ||
        images.contains(product.image)) {
      continue;
    }
    ids.add(product.id);
    images.add(product.image);
    result.add(product);
  }
  return result;
}

TabletopSearchShelves splitPlateCupShelves(
  List<Product> plates,
  List<Product> cups,
) {
  final plateRow = uniqueShelfProducts(plates);
  final cupRow = uniqueShelfProducts(cups, exclude: plateRow);
  return TabletopSearchShelves(plates: plateRow, cups: cupRow);
}

final platesCupsShelvesProvider =
    FutureProvider<TabletopSearchShelves>((ref) async {
  final api = ref.read(catalogApiClientProvider);
  final pages = await Future.wait([
    for (final query in ['plates', 'cups'])
      api.fetchProductsPage(
          shop: 'kitchen', aisle: 'tabletop', query: query, pageSize: 24),
  ]);
  return splitPlateCupShelves(pages[0].products, pages[1].products);
});
