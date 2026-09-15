import '../models/product.dart';
import '../data/kitchen_ware.dart';
import 'categories.dart';
import 'kitchen_mode.dart';

const pdpRecommendationCount = 16;

double _popularityScore(Product product) {
  return product.reviewCount * product.rating + (product.prime ? 50 : 0);
}

List<Product> _scopedCatalog(Product product, List<Product> allProducts) {
  return isKitchenProduct(product)
      ? filterKitchenProducts(allProducts)
      : excludeKitchenProducts(allProducts);
}

List<Product> pickRelatedProducts(
  Product product,
  List<Product> allProducts, {
  int limit = pdpRecommendationCount,
}) {
  final catalog = _scopedCatalog(product, allProducts);
  final related = catalog
      .where(
        (p) =>
            p.id != product.id &&
            p.inStock &&
            (isKitchenProduct(product)
                ? aisleIdFromProductId(p.id) == aisleIdFromProductId(product.id) ||
                    productMatchesCategory(p.category, product.category)
                : productMatchesCategory(p.category, product.category)),
      )
      .toList()
    ..sort((a, b) => _popularityScore(b).compareTo(_popularityScore(a)));

  if (related.length >= limit) return related.take(limit).toList();

  final exclude = {product.id, ...related.map((p) => p.id)};
  final fillers = catalog.where((p) => !exclude.contains(p.id) && p.inStock).toList()
    ..sort((a, b) => _popularityScore(b).compareTo(_popularityScore(a)));
  return [...related, ...fillers].take(limit).toList();
}

List<Product> pickYouMightAlsoLike(
  Product product,
  List<Product> allProducts, {
  Iterable<String> excludeIds = const [],
  int limit = pdpRecommendationCount,
}) {
  final catalog = _scopedCatalog(product, allProducts);
  final exclude = {product.id, ...excludeIds};
  final currentCategory = normalizeCategoryId(product.category);
  final currentAisle = aisleIdFromProductId(product.id);

  final picks = catalog
      .where((p) {
        if (exclude.contains(p.id) || !p.inStock) return false;
        if (isKitchenProduct(product)) {
          final aisle = aisleIdFromProductId(p.id);
          return aisle != null && aisle != currentAisle;
        }
        return normalizeCategoryId(p.category) != currentCategory;
      })
      .toList()
    ..sort((a, b) => _popularityScore(b).compareTo(_popularityScore(a)));

  return picks.take(limit).toList();
}
