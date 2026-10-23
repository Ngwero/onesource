import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/product.dart';
import 'paginated_products_provider.dart';

List<Product> mixPlateCupProducts(List<Product> plates, List<Product> cups) {
  final result = <Product>[];
  final ids = <String>{};
  final images = <String>{};
  final length = plates.length > cups.length ? plates.length : cups.length;
  for (var i = 0; i < length; i++) {
    for (final pool in [plates, cups]) {
      if (i >= pool.length) continue;
      final product = pool[i];
      if (product.image.isEmpty ||
          ids.contains(product.id) ||
          images.contains(product.image)) {
        continue;
      }
      ids.add(product.id);
      images.add(product.image);
      result.add(product);
    }
  }
  return result;
}

final platesCupsShelfProvider = FutureProvider<List<Product>>((ref) async {
  final api = ref.read(catalogApiClientProvider);
  final pages = await Future.wait([
    for (final query in ['plates', 'cups'])
      api.fetchProductsPage(
          shop: 'kitchen', aisle: 'tabletop', query: query, pageSize: 12),
  ]);
  return mixPlateCupProducts(pages[0].products, pages[1].products);
});
