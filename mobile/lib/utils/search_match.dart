import '../models/product.dart';

List<String> queryVariants(String query) {
  final q = query.trim().toLowerCase();
  if (q.isEmpty) return [];
  final variants = <String>{q};
  if (q.length > 4 && q.endsWith('oes')) {
    variants.add(q.substring(0, q.length - 2));
    variants.add(q.substring(0, q.length - 1));
  } else if (q.length > 3 && q.endsWith('es')) {
    variants.add(q.substring(0, q.length - 2));
    variants.add(q.substring(0, q.length - 1));
  } else if (q.length > 3 && q.endsWith('s') && !q.endsWith('ss')) {
    variants.add(q.substring(0, q.length - 1));
  } else if (q.length > 2) {
    variants.add('${q}s');
    if (!q.endsWith('e')) variants.add('${q}es');
  }
  return variants.toList();
}

String _haystack(Product product) {
  return [
    product.title,
    product.description,
    product.category,
    product.supplierName,
    product.unit,
  ].whereType<String>().join(' ').toLowerCase();
}

bool _tokenMatches(String token, String hay) {
  if (token.length < 2) return true;
  return queryVariants(token).any((v) => v.length >= 2 && hay.contains(v));
}

bool productMatchesSearch(Product product, String rawQuery) {
  final query = rawQuery.trim().toLowerCase();
  if (query.isEmpty) return false;
  final hay = _haystack(product);
  final tokens = query.split(RegExp(r'\s+')).where((t) => t.length >= 2);
  if (tokens.isEmpty) return false;
  return tokens.every((token) => _tokenMatches(token, hay));
}

int searchScore(Product product, String rawQuery) {
  final query = rawQuery.trim().toLowerCase();
  if (query.isEmpty) return 0;
  final variants = queryVariants(query);
  final title = product.title.toLowerCase();
  final category = product.category.toLowerCase();
  final description = product.description.toLowerCase();
  final supplier = (product.supplierName ?? '').toLowerCase();
  final hay = _haystack(product);

  var score = 0;
  for (final v in variants) {
    if (v.length < 2) continue;
    if (title == v) {
      score += 200;
    } else if (title.startsWith(v)) {
      score += 120;
    } else if (title.contains(v)) {
      score += 70;
    }
    if (category.contains(v)) score += 40;
    if (description.contains(v)) score += 20;
    if (supplier.contains(v)) score += 15;
    if (hay.contains(v)) score += 5;
  }

  score += (product.reviewCount / 80).clamp(0, 15).round();
  score += (product.rating * 2).round();
  if (product.prime) score += 3;
  return score;
}

List<Product> rankSearchResults(List<Product> products, String query) {
  final q = query.trim();
  if (q.isEmpty) return products;
  final ranked = [...products]..sort((a, b) => searchScore(b, q).compareTo(searchScore(a, q)));
  return ranked;
}

List<Product> filterAndRankProducts(List<Product> products, String query) {
  final q = query.trim();
  if (q.isEmpty) return [];
  return rankSearchResults(
    products.where((p) => productMatchesSearch(p, q)).toList(),
    q,
  );
}
