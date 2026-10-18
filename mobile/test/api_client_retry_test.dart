import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:onesource_mobile/services/api_client.dart';

void main() {
  test('product reads recover from a temporary server failure', () async {
    var requests = 0;
    final client = MockClient((request) async {
      requests++;
      if (requests == 1) {
        return http.Response(
          jsonEncode({'error': 'temporary database timeout'}),
          503,
        );
      }
      return http.Response(
        jsonEncode({
          'products': [
            {
              'id': 'fresh-test-product',
              'title': 'Test product',
              'price': 1000,
            },
          ],
          'total': 1,
          'hasMore': false,
        }),
        200,
      );
    });

    final result = await ApiClient(client: client).fetchProductsPage(
      shop: 'fresh',
      pageSize: 8,
    );

    expect(requests, 2);
    expect(result.products.single.id, 'fresh-test-product');
  });
}
