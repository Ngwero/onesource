import '../data/kitchen_ware.dart';
import '../models/product.dart';
import 'categories.dart';

bool isKitchenPath(String location) {
  final path = Uri.tryParse(location)?.path ?? location;
  if (path == '/kitchen' || path.startsWith('/kitchen/')) return true;
  if (path.contains('kitchen-ware')) return true;
  // Kitchen PDP keeps kitchen chrome (SKU ids are kitchen-{aisle}-…).
  return RegExp(r'^/product/kitchen-').hasMatch(path);
}

bool isKitchenProduct(Product? product) {
  if (product == null) return false;
  if (product.id.startsWith('kitchen-')) return true;
  return productMatchesCategory(product.category, kitchenWareCategoryId);
}

List<Product> excludeKitchenProducts(List<Product> products) =>
    products.where((p) => !isKitchenProduct(p)).toList();

List<Product> filterKitchenProducts(List<Product> products) =>
    products.where(isKitchenProduct).toList();

List<Product> filterKitchenAisle(List<Product> products, String aisleId) =>
    products.where((p) => aisleIdFromProductId(p.id) == aisleId).toList();

/// Round-robin across aisles so home grids aren't one category (e.g. glasses).
List<Product> diversifyKitchenProducts(List<Product> products, {int limit = 24}) {
  if (products.isEmpty || limit <= 0) return const [];
  final groups = groupKitchenByAisle(products)
      .map((g) => g.products)
      .where((list) => list.isNotEmpty)
      .toList();
  if (groups.isEmpty) return products.take(limit).toList();

  final out = <Product>[];
  final seen = <String>{};
  var depth = 0;
  while (out.length < limit) {
    var added = false;
    for (final group in groups) {
      if (depth >= group.length) continue;
      final product = group[depth];
      if (seen.add(product.id)) {
        out.add(product);
        added = true;
        if (out.length >= limit) break;
      }
    }
    if (!added) break;
    depth++;
  }
  return out;
}

final _saucepanRe = RegExp(r'sauce\s*pans?', caseSensitive: false);

bool isSaucepanProduct(Product product) => _saucepanRe.hasMatch(product.title);

List<Product> filterSaucepans(List<Product> products) =>
    products.where(isSaucepanProduct).toList();

/// Saucepans first, then the rest (stable enough for shop grids).
List<Product> sortKitchenWithSaucepansFirst(List<Product> products) {
  final saucepans = <Product>[];
  final rest = <Product>[];
  for (final p in products) {
    if (isSaucepanProduct(p)) {
      saucepans.add(p);
    } else {
      rest.add(p);
    }
  }
  int byPopularity(Product a, Product b) =>
      (b.reviewCount * b.rating).compareTo(a.reviewCount * a.rating);
  saucepans.sort(byPopularity);
  rest.sort(byPopularity);
  return [...saucepans, ...rest];
}

class KitchenAisleGroup {
  const KitchenAisleGroup({
    required this.aisle,
    required this.products,
  });

  final KitchenAisle aisle;
  final List<Product> products;
}

List<KitchenAisleGroup> groupKitchenByAisle(List<Product> products) {
  final groups = <String, List<Product>>{
    for (final aisle in kitchenWareAisles) aisle.id: <Product>[],
  };

  for (final product in products) {
    final id = aisleIdFromProductId(product.id);
    if (id == null) continue;
    groups.putIfAbsent(id, () => <Product>[]).add(product);
  }

  return kitchenWareAisles
      .map(
        (aisle) => KitchenAisleGroup(
          aisle: aisle,
          products: groups[aisle.id] ?? const [],
        ),
      )
      .toList();
}
