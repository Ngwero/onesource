import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:onesource_mobile/models/product.dart';
import 'package:onesource_mobile/utils/search_match.dart';

void main() {
  final fixtures =
      jsonDecode(File('../shared/search-fixtures.json').readAsStringSync())
          as List;
  for (final raw in fixtures) {
    final fixture = raw as Map<String, dynamic>;
    final product =
        Product.fromJson(fixture['product'] as Map<String, dynamic>);
    final query = fixture['query'] as String;
    test('$query: ${product.title}', () {
      expect(productMatchesSearch(product, query), fixture['matches']);
      for (final tag in fixture['tags'] as List? ?? []) {
        expect(getProductSearchTags(product), contains(tag));
      }
    });
  }

  test('exact names rank ahead of related product types', () {
    final direct =
        Product.fromJson({'id': 'kitchen-tabletop-z', 'title': 'Dinner Plate'});
    final related = Product.fromJson({
      'id': 'kitchen-tabletop-a',
      'title': 'Dinnerware Set',
      'reviewCount': 50000
    });
    expect(rankSearchResults([related, direct], 'plates'), [direct, related]);
  });

  test('API search tags survive cached product serialization', () {
    final product = Product.fromJson({
      'id': 'kitchen-1',
      'title': 'Plate',
      'searchTags': ['plates', 'tableware']
    });
    expect(
        Product.fromJson(product.toJson()).searchTags, ['plates', 'tableware']);
    expect(queryVariants('plates'), isNot(contains('plat')));
  });
}
