import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:onesource_mobile/models/product.dart';
import 'package:onesource_mobile/models/order.dart';
import 'package:onesource_mobile/providers/cart_provider.dart';
import 'package:onesource_mobile/providers/currency_provider.dart';
import 'package:onesource_mobile/screens/checkout_screen.dart';
import 'package:onesource_mobile/services/api_client.dart';
import 'package:onesource_mobile/services/auth_service.dart';

Product product({int? stock, bool inStock = true}) => Product.fromJson({
      'id': 'fresh-test',
      'title': 'Test product',
      'price': 1000,
      'stockQuantity': stock,
      'inStock': inStock,
    });

class GuestAuth extends AuthService {
  GuestAuth() : super(ApiClient());
  @override
  User? get user => null;
}

class PendingOrderApi extends ApiClient {
  final result = Completer<Order>();
  int calls = 0;
  @override
  Future<Order> placeOrder(CreateOrderPayload payload) {
    calls++;
    return result.future;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('cart count and subtotal follow restoration and every mutation',
      () async {
    SharedPreferences.setMockInitialValues({
      'onesource_cart_v1': jsonEncode([
        {'product': product().toJson(), 'quantity': 2}
      ]),
    });
    final container = ProviderContainer();
    addTearDown(container.dispose);
    expect(container.read(cartItemCountProvider), 0);
    expect(container.read(cartSubtotalProvider), 0);
    await Future<void>.delayed(Duration.zero);
    final cart = container.read(cartProvider.notifier);
    void check(int count) {
      expect(container.read(cartItemCountProvider), count);
      expect(container.read(cartSubtotalProvider), count * 1000);
    }

    check(2);
    cart.add(product());
    check(3);
    cart.setQuantity('fresh-test', 5);
    check(5);
    cart.remove('fresh-test');
    check(0);
    cart.add(product());
    check(1);
    cart.clear();
    check(0);
    await Future<void>.delayed(Duration.zero);
  });

  test('unavailable stock cannot be added and available stock is capped',
      () async {
    final cart = CartNotifier();
    addTearDown(cart.dispose);
    await Future<void>.delayed(Duration.zero);
    for (final item in [
      product(stock: 0),
      product(stock: -1),
      product(inStock: false)
    ]) {
      cart.add(item);
      expect(cart.itemCount, 0);
    }
    cart.add(product(stock: 2), quantity: 10);
    expect(cart.itemCount, 2);
    cart.setQuantity('fresh-test', 10);
    expect(cart.itemCount, 2);
    cart.add(product(stock: 2), quantity: -1);
    expect(cart.itemCount, 2);
    await Future<void>.delayed(Duration.zero);
  });

  test('restored zero-stock cart can be adjusted safely and removed', () async {
    SharedPreferences.setMockInitialValues({
      'onesource_cart_v1': jsonEncode([
        {'product': product(stock: 0).toJson(), 'quantity': 1}
      ]),
    });
    final cart = CartNotifier();
    addTearDown(cart.dispose);
    await Future<void>.delayed(Duration.zero);
    cart.setQuantity('fresh-test', 2);
    expect(cart.itemCount, 1);
    cart.setQuantity('fresh-test', 0);
    expect(cart.itemCount, 0);
    await Future<void>.delayed(Duration.zero);
  });

  for (final succeeds in [true, false]) {
    testWidgets(
        'leaving checkout before ${succeeds ? 'success' : 'failure'} is safe',
        (tester) async {
      await tester.binding.setSurfaceSize(const Size(900, 2400));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final api = PendingOrderApi();
      final container = ProviderContainer(overrides: [
        authServiceProvider.overrideWithValue(GuestAuth()),
        authStateProvider
            .overrideWith((ref) => const Stream<AuthState>.empty()),
        formatPriceProvider.overrideWithValue((amount) => 'USh $amount'),
        checkoutApiClientProvider.overrideWithValue(api),
      ]);
      addTearDown(container.dispose);
      final cart = container.read(cartProvider.notifier);
      await tester.runAsync(() => Future<void>.delayed(Duration.zero));
      cart.add(product());
      await tester.pumpWidget(UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(home: CheckoutScreen()),
      ));
      await tester.pump();
      final fields = find.byType(TextFormField);
      await tester.enterText(fields.at(0), 'Test Shopper');
      await tester.enterText(fields.at(1), 'test@example.com');
      await tester.enterText(fields.at(3), 'Test address');
      await tester.enterText(fields.at(5), 'Kampala');
      final submit = find.byType(ElevatedButton);
      await tester.ensureVisible(submit);
      await tester.tap(submit);
      await tester.pump();
      expect(api.calls, 1);
      await tester.pumpWidget(const MaterialApp(home: SizedBox.shrink()));
      // A later addition must survive completion of the earlier order.
      cart.add(product());
      if (succeeds) {
        api.result.complete(Order.fromJson({'id': 'order-test'}));
      } else {
        api.result.completeError(Exception('Server unavailable'));
      }
      await tester.pump();
      expect(tester.takeException(), isNull);
      expect(cart.itemCount, succeeds ? 1 : 2);
    });
  }
}
