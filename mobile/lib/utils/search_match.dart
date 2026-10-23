import '../models/product.dart';
import 'search_taxonomy.g.dart';

final _folds = <String, String>{
  for (final entry in searchFolds.entries)
    for (final rune in entry.value.runes) String.fromCharCode(rune): entry.key,
};

List<String> searchTokens(String value) {
  final text = value
      .toLowerCase()
      .runes
      .map((rune) =>
          _folds[String.fromCharCode(rune)] ?? String.fromCharCode(rune))
      .join()
      .replaceAll(RegExp(r'[\u0300-\u036f]'), '')
      .replaceAll(RegExp(r'<[^>]*>'), ' ')
      .replaceAll(RegExp(r"\bl['’]oreal\b"), 'loreal')
      .replaceAllMapped(RegExp(r"([a-z])['’]s\b"), (m) => m[1]!)
      .replaceAllMapped(RegExp(r'(\d)([a-z])'), (m) => '${m[1]} ${m[2]}')
      .replaceAllMapped(RegExp(r'([a-z])(\d)'), (m) => '${m[1]} ${m[2]}');
  return RegExp(r'[a-z0-9]+').allMatches(text).map((m) => m[0]!).toList();
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

List<String> _words(String value) => searchTokens(value)
    .map((word) => _singular(
        searchCorrections[word] ?? searchCorrections[_singular(word)] ?? word))
    .toList();
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

class _TagGroup {
  _TagGroup(Map<String, dynamic> group)
      : shop = group['shop'] as String,
        tags = _strings(group, 'tags'),
        aisles = _strings(group, 'aisles'),
        sources = _strings(group, 'sources').map(_words).toList(),
        excludes = _strings(group, 'exclude').map(_words).toList(),
        aliases = [..._strings(group, 'sources'), ..._strings(group, 'tags')]
            .map(_phraseKey)
            .toSet();
  final String shop;
  final List<String> tags;
  final List<String> aisles;
  final List<List<String>> sources;
  final List<List<String>> excludes;
  final Set<String> aliases;
}

final _groups = searchTagGroups.map(_TagGroup.new).toList();
final _byAlias = <String, List<_TagGroup>>{
  for (final alias in _groups.expand((g) => g.aliases).toSet())
    alias: _groups.where((g) => g.aliases.contains(alias)).toList(),
};

List<String> _tagsFor(List<String> title, String? shop) {
  final tags = <String>{};
  for (final group in _groups) {
    if (shop != null && group.shop != shop) continue;
    if (group.excludes.any((phrase) => _includesPhrase(title, phrase))) {
      continue;
    }
    if (group.sources.any((phrase) => _includesPhrase(title, phrase))) {
      tags.addAll(group.tags);
    }
  }
  return tags.toList();
}

List<String> getProductSearchTags(Product product) =>
    _tagsFor(_words(product.title), _shopOf(product));

final _queryCache = <String, List<String>>{};
List<String> _queryGroups(String query) {
  final cached = _queryCache[query];
  if (cached != null) return cached;
  final words = _words(query);
  final result = <String>[];
  for (var i = 0; i < words.length;) {
    var size = 1;
    for (var length = (words.length - i).clamp(1, 4); length > 1; length--) {
      if (_byAlias.containsKey(words.sublist(i, i + length).join(' '))) {
        size = length;
        break;
      }
    }
    result.add(words.sublist(i, i + size).join(' '));
    i += size;
  }
  if (_queryCache.length >= 256) _queryCache.remove(_queryCache.keys.first);
  _queryCache[query] = result;
  return result;
}

int searchScore(Product product, String query) {
  final alternatives = searchCollections[_phraseKey(query)];
  if (alternatives != null) {
    return alternatives
        .map((term) => searchScore(product, term))
        .reduce((a, b) => a > b ? a : b);
  }
  final terms = _queryGroups(query);
  if (terms.isEmpty) return -1;
  final title = _words(product.title);
  final shop = _shopOf(product);
  final phrase = _words(query);
  final words = [
    ...title,
    '|',
    ...[
      product.details.brand,
      product.category,
      product.unit,
      product.supplierName,
      ..._tagsFor(title, shop),
      ...product.searchTags,
    ].whereType<String>().expand((field) => [..._words(field), '|'])
  ];
  for (final term in terms) {
    if (!_includesPhrase(words, term.split(' '))) return -1;
    final excluded = (_byAlias[term] ?? []).any((group) =>
        (shop == null || group.shop == shop) &&
        group.excludes.any((p) => _includesPhrase(title, p)) &&
        !group.excludes
            .any((p) => _includesPhrase(title, p) && p.every(phrase.contains)));
    if (excluded) return -1;
  }
  final preferred = terms.any((term) => (_byAlias[term] ?? []).any((group) =>
      group.shop == shop &&
      group.aisles.any((aisle) => product.id.startsWith('$shop-$aisle-'))));
  var score =
      (preferred ? 1500 : 0) + (_includesPhrase(title, phrase) ? 1000 : 0);
  if (title.join(' ') == phrase.join(' ')) score += 1000;
  for (final term in terms) {
    if (_includesPhrase(title, term.split(' '))) score += 100;
  }
  return score;
}

bool productMatchesSearch(Product product, String query) =>
    searchScore(product, query) >= 0;

List<Product> rankSearchResults(List<Product> products, String query) {
  final scored = products
      .map((product) => (product: product, score: searchScore(product, query)))
      .toList();
  scored.sort((a, b) {
    final score = b.score.compareTo(a.score);
    return score != 0 ? score : a.product.id.compareTo(b.product.id);
  });
  return scored.map((item) => item.product).toList();
}

List<Product> filterAndRankProducts(List<Product> products, String query) =>
    rankSearchResults(products, query)
        .where((p) => productMatchesSearch(p, query))
        .toList();
