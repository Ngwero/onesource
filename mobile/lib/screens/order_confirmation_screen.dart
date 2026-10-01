import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../models/order.dart';
import '../providers/currency_provider.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';

final _confirmedOrderProvider =
    FutureProvider.autoDispose.family<Order?, (String, String?)>((ref, args) async {
  try {
    return await apiClientProvider.fetchOrderById(args.$1, userId: args.$2);
  } catch (_) {
    return null;
  }
});

/// Thank-you page after placing an order (website: /checkout/confirmation/:id).
class OrderConfirmationScreen extends ConsumerWidget {
  const OrderConfirmationScreen({
    super.key,
    required this.orderId,
    this.isExport = false,
    this.paymentKey,
  });

  final String orderId;
  final bool isExport;

  /// Translation key of the chosen payment method.
  final String? paymentKey;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = context.tr;
    final user = ref.watch(authStateProvider).value?.session?.user;
    final order = ref.watch(_confirmedOrderProvider((orderId, user?.id))).valueOrNull;
    final formatPrice = ref.watch(formatPriceProvider);
    final shortId = orderId.length > 8 ? orderId.substring(0, 8).toUpperCase() : orderId.toUpperCase();

    Widget row(String label, String value) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: Text(label, style: const TextStyle(color: AppColors.textMuted))),
              const SizedBox(width: 12),
              Flexible(
                child: Text(
                  value,
                  textAlign: TextAlign.end,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        );

    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const SizedBox(height: 24),
            Center(
              child: Container(
                width: 84,
                height: 84,
                decoration: BoxDecoration(
                  color: AppColors.lemonGreen.withValues(alpha: 0.35),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isExport ? Icons.flight_takeoff_rounded : Icons.check_rounded,
                  size: 44,
                  color: AppColors.darkGreen,
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              s.get(isExport ? 'exports.confirmation.confirmedTitle' : 'checkout.confirmedTitle'),
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(
              s.get(isExport ? 'exports.confirmation.confirmedSubtitle' : 'checkout.confirmedSubtitle'),
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textMuted, height: 1.45),
            ),
            const SizedBox(height: 24),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      s.get('orders.trackOrder'),
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                    ),
                    const SizedBox(height: 8),
                    row(s.get('checkout.orderId'), '#$shortId'),
                    if (order != null) ...[
                      row(s.get('cart.total'), formatPrice(order.total)),
                      if ((order.city ?? '').isNotEmpty) row(s.get('checkout.delivery'), order.city!),
                    ],
                    if (!isExport)
                      row(s.get('checkout.payment'), s.get(paymentKey ?? 'checkout.payOnDelivery')),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            if (user != null)
              ElevatedButton(
                onPressed: () => context.go('/orders/$orderId'),
                child: Text(s.get('orders.trackOrder')),
              )
            else
              ElevatedButton(
                onPressed: () => context.push('/login'),
                child: Text(s.get('auth.signIn')),
              ),
            const SizedBox(height: 10),
            if (user != null)
              OutlinedButton(
                onPressed: () => context.go('/orders'),
                child: Text(s.get('checkout.viewOrders')),
              ),
            const SizedBox(height: 4),
            TextButton(
              onPressed: () => context.go(isExport ? '/exports' : '/home'),
              child: Text(s.get(isExport ? 'exports.confirmation.browse' : 'common.backToShop')),
            ),
          ],
        ),
      ),
    );
  }
}
