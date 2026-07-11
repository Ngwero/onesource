import '../models/product.dart';
import 'categories.dart';

const pdpRecommendationCount = 16;

double _popularityScore(Product product) {
  return product.reviewCount * product.rating + (product.prime ? 50 : 0);
}

List<Product> pickRelatedProducts(
  Product product,
  List<Product> allProducts, {
  int limit = pdpRecommendationCount,
}) {
  final related = allProducts
      .where(
        (p) =>
            p.id != product.id &&
            p.inStock &&
            productMatchesCategory(p.category, product.category),
      )
      .toList()
    ..sort((a, b) => _popularityScore(b).compareTo(_popularityScore(a)));
  return related.take(limit).toList();
}

List<Product> pickYouMightAlsoLike(
  Product product,
  List<Product> allProducts, {
  Iterable<String> excludeIds = const [],
  int limit = pdpRecommendationCount,
}) {
  final exclude = {product.id, ...excludeIds};
  final currentCategory = normalizeCategoryId(product.category);

  final picks = allProducts
      .where(
        (p) =>
            !exclude.contains(p.id) &&
            p.inStock &&
            normalizeCategoryId(p.category) != currentCategory,
      )
      .toList()
    ..sort((a, b) => _popularityScore(b).compareTo(_popularityScore(a)));

  return picks.take(limit).toList();
}
