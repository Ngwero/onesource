import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../config/theme.dart';
import '../models/order.dart';
import '../services/api_client.dart';
import '../widgets/order_progress.dart';

final _currency = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);

class OrderDetailScreen extends ConsumerWidget {
  const OrderDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final paymentMethod = GoRouterState.of(context).extra as String?;

    return Scaffold(
      appBar: AppBar(title: const Text('Order details')),
      body: FutureBuilder<Order>(
        future: apiClientProvider.fetchOrderById(orderId),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError || !snapshot.hasData) {
            return Center(child: Text(snapshot.error?.toString() ?? 'Order not found'));
          }
          final order = snapshot.data!;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Card(
                color: AppColors.accentLight,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.check_circle, color: AppColors.accent, size: 40),
                      const SizedBox(height: 8),
                      const Text('Order placed!', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                      Text('Order #${order.id.substring(0, 8)}', style: const TextStyle(color: AppColors.textMuted)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text('Delivery progress', style: TextStyle(fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              OrderProgress(status: order.status),
              const SizedBox(height: 8),
              Text('Status: ${order.status}', style: const TextStyle(color: AppColors.textMuted)),
              if (paymentMethod != null) ...[
                const SizedBox(height: 16),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.payment, color: AppColors.accent),
                  title: const Text('Payment'),
                  subtitle: Text(paymentMethod == 'mobile' ? 'Mobile money' : 'Pay on delivery'),
                ),
              ],
              const SizedBox(height: 16),
              const Text('Items', style: TextStyle(fontWeight: FontWeight.w800)),
              ...order.orderItems.map(
                (item) => Card(
                  child: ListTile(
                    title: Text(item.productTitle),
                    subtitle: Text('Qty ${item.quantity}'),
                    trailing: Text(_currency.format(item.lineTotal)),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      _row('Subtotal', _currency.format(order.subtotal)),
                      _row('Delivery', order.deliveryFee == 0 ? 'FREE' : _currency.format(order.deliveryFee)),
                      const Divider(),
                      _row('Total', _currency.format(order.total), bold: true),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: () => context.go('/shop'), child: const Text('Continue shopping')),
            ],
          );
        },
      ),
    );
  }

  Widget _row(String label, String value, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontWeight: bold ? FontWeight.w800 : null)),
          Text(value, style: TextStyle(fontWeight: bold ? FontWeight.w800 : FontWeight.w600)),
        ],
      ),
    );
  }
}
