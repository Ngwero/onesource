import '../models/product.dart';
import 'search_taxonomy.g.dart';

List<String> searchTokens(String value) {
  final text = value
      .toLowerCase()
      .replaceAll(RegExp(r'<[^>]*>'), ' ')
      .replaceAllMapped(RegExp(r'(\d)([a-zà-öø-ÿ])'), (m) => '${m[1]} ${m[2]}')
      .replaceAllMapped(RegExp(r'([a-zà-öø-ÿ])(\d)'), (m) => '${m[1]} ${m[2]}');
  return RegExp(r'[a-zà-öø-ÿ0-9]+').allMatches(text).map((m) => m[0]!).toList();
}

String _singular(String word) {
  if (searchPlurals.containsKey(word)) return searchPlurals[word]!;
  if (word.length > 4 && word.endsWith('ies')) {
    return '${word.substring(0, word.length - 3)}y';
  }
  if (RegExp(r'(ches|shes|sses|xes|zes)$').hasMatch(word)) {
    return word.substring(0, word.length - 2);
  }
  if (word.length > 3 &&
      word.endsWith('s') &&
      !RegExp(r'(ss|us|is)$').hasMatch(word)) {
    return word.substring(0, word.length - 1);
  }
  return word;
}

List<String> _words(String value) =>
    searchTokens(value).map(_singular).toList();
String _phraseKey(String value) => _words(value).join(' ');

List<String> queryVariants(String query) {
  final key = _phraseKey(query);
  return <String>{
    query.trim().toLowerCase(),
    key,
    ...searchPlurals.entries.where((e) => e.value == key).map((e) => e.key),
  }.where((s) => s.isNotEmpty).toList();
}

bool _includesPhrase(List<String> words, List<String> phrase) {
  if (phrase.isEmpty) return false;
  for (var i = 0; i <= words.length - phrase.length; i++) {
    var matches = true;
    for (var j = 0; j < phrase.length; j++) {
      if (words[i + j] != phrase[j]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}

List<String> _strings(Map<String, dynamic> group, String key) =>
    (group[key] as List<dynamic>? ?? []).cast<String>();

String? _shopOf(Product product) {
  for (final shop in ['kitchen', 'cosmetics', 'pharmacy']) {
    if (product.id.startsWith('$shop-') || product.category.startsWith(shop)) {
      return shop;
    }
  }
  return product.id.isNotEmpty || product.category.isNotEmpty ? 'fresh' : null;
}

List<String> getProductSearchTags(Product product) {
  final title = _words(product.title);
  final shop = _shopOf(product);
  final tags = <String>{};
  for (final group in searchTagGroups) {
    if (shop != null && group['shop'] != shop) continue;
    if (_strings(group, 'exclude')
        .any((phrase) => _includesPhrase(title, _words(phrase)))) {
      continue;
    }
    if (_strings(group, 'sources')
        .any((phrase) => _includesPhrase(title, _words(phrase)))) {
      tags.addAll(_strings(group, 'tags'));
    }
  }
  return tags.toList();
}

final _aliases = searchTagGroups
    .expand((group) => [
          ..._strings(group, 'sources'),
          ..._strings(group, 'tags'),
        ])
    .map(_phraseKey)
    .toSet();

List<String> _queryGroups(String query) {
  final words = _words(query);
  final result = <String>[];
  for (var i = 0; i < words.length;) {
    var size = 1;
    for (var length = (words.length - i).clamp(1, 4); length > 1; length--) {
      if (_aliases.contains(words.sublist(i, i + length).join(' '))) {
        size = length;
        break;
      }
    }
    result.add(words.sublist(i, i + size).join(' '));
    i += size;
  }
  return result;
}

List<String> _searchableWords(Product product) => [
      product.title,
      product.details.brand,
      product.category,
      product.unit,
      product.supplierName,
      ...getProductSearchTags(product),
      ...product.searchTags,
    ].whereType<String>().expand((field) => [..._words(field), '|']).toList();

bool productMatchesSearch(Product product, String query) {
  final terms = _queryGroups(query);
  if (terms.isEmpty) return false;
  final words = _searchableWords(product);
  final title = _words(product.title);
  final shop = _shopOf(product);
  return terms.every((term) {
    final excluded = searchTagGroups.any((group) =>
        (shop == null || group['shop'] == shop) &&
        [..._strings(group, 'sources'), ..._strings(group, 'tags')]
            .map(_phraseKey)
            .contains(term) &&
        _strings(group, 'exclude')
            .any((phrase) => _includesPhrase(title, _words(phrase))) &&
        !_strings(group, 'exclude').any((phrase) =>
            _includesPhrase(title, _words(phrase)) &&
            _words(phrase).every((word) => _words(query).contains(word))));
    return !excluded && _includesPhrase(words, term.split(' '));
  });
}

int searchScore(Product product, String query) {
  if (!productMatchesSearch(product, query)) return -1;
  final title = _words(product.title);
  final phrase = _words(query);
  var score = _includesPhrase(title, phrase) ? 1000 : 0;
  if (title.join(' ') == phrase.join(' ')) score += 1000;
  for (final term in _queryGroups(query)) {
    if (_includesPhrase(title, term.split(' '))) score += 100;
  }
  return score;
}

List<Product> rankSearchResults(List<Product> products, String query) {
  return [...products]..sort((a, b) {
      final score = searchScore(b, query).compareTo(searchScore(a, query));
      return score != 0 ? score : a.id.compareTo(b.id);
    });
}

List<Product> filterAndRankProducts(List<Product> products, String query) =>
    rankSearchResults(
        products.where((p) => productMatchesSearch(p, query)).toList(), query);
