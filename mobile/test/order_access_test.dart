import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:onesource_mobile/models/order.dart';
import 'package:onesource_mobile/services/api_client.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test('order history sends the current verified session token', () async {
    final api = ApiClient(accessToken: () => 'test-session', client: MockClient((request) async {
      expect(request.headers['Authorization'], 'Bearer test-session');
      return http.Response('{"orders":[]}', 200);
    }));
    expect(await api.fetchOrders('user'), isEmpty);
  });
  test('guest checkout keeps its confirmation credential scoped to the order', () async {
    final api = ApiClient(accessToken: () => null, client: MockClient((request) async {
      if (request.method == 'POST') {
        expect(request.headers['Authorization'], isNull);
        return http.Response(jsonEncode({'order': {'id': 'guest-order'}, 'accessToken': 'guest-token'}), 201);
      }
      expect(request.headers['X-Order-Token'], 'guest-token');
      return http.Response('{"order":{"id":"guest-order"}}', 200);
    }));
    final order = await api.placeOrder(const CreateOrderPayload(
      email: 'test@example.invalid', fullName: 'Test', addressLine1: 'Test', city: 'Test',
      subtotal: 1, deliveryFee: 0, total: 1, items: [],
    ));
    expect((await api.fetchOrderById(order.id)).id, order.id);
  });
}
