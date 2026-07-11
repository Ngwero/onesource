import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../config/theme.dart';
import '../models/order.dart';
import '../services/api_client.dart';
import '../widgets/order_progress.dart';
import '../widgets/product_thumbnail.dart';

final _currency = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);
final _dateFormat = DateFormat('d MMM yyyy');

class OrderDetailScreen extends ConsumerWidget {
  const OrderDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final paymentMethod = GoRouterState.of(context).extra as String?;

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: const Text('Order tracking'),
        centerTitle: true,
        backgroundColor: AppColors.canvas,
      ),
      body: FutureBuilder<Order>(
        future: apiClientProvider.fetchOrderById(orderId),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: AppColors.darkGreen));
          }
          if (snapshot.hasError || !snapshot.hasData) {
            return Center(child: Text(snapshot.error?.toString() ?? 'Order not found'));
          }
          final order = snapshot.data!;
          final shortId = order.id.length > 8 ? order.id.substring(0, 8).toUpperCase() : order.id.toUpperCase();
          final orderDate = _formatDate(order.createdAt);

          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
            children: [
              _DeliveryPersonnelCard(city: order.city),
              const SizedBox(height: 20),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(22),
                  boxShadow: softCardShadow,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Delivery progress',
                          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                        ),
                        _StatusBadge(status: order.status),
                      ],
                    ),
                    const SizedBox(height: 20),
                    OrderProgress(status: order.status, vertical: true),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Order #$shortId',
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
              ),
              if (orderDate != null)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(orderDate, style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
                ),
              const SizedBox(height: 14),
              ...order.orderItems.map((item) => _OrderItemCard(item: item, status: order.status)),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(22),
                  boxShadow: softCardShadow,
                ),
                child: Column(
                  children: [
                    _SummaryRow('Subtotal', _currency.format(order.subtotal)),
                    _SummaryRow(
                      'Shipping fee',
                      order.deliveryFee == 0 ? 'FREE' : _currency.format(order.deliveryFee),
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      child: Divider(height: 1),
                    ),
                    _SummaryRow('Total', _currency.format(order.total), bold: true),
                    if (paymentMethod != null) ...[
                      const SizedBox(height: 12),
                      _SummaryRow(
                        'Payment',
                        paymentMethod == 'mobile' ? 'Mobile money' : 'Pay on delivery',
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 20),
              OutlinedButton(
                onPressed: () => context.go('/shop'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(50),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: const Text('Continue shopping'),
              ),
            ],
          );
        },
      ),
    );
  }

  String? _formatDate(String iso) {
    try {
      return _dateFormat.format(DateTime.parse(iso).toLocal());
    } catch (_) {
      return null;
    }
  }
}

class _DeliveryPersonnelCard extends StatelessWidget {
  const _DeliveryPersonnelCard({this.city});

  final String? city;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: softCardShadow,
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 28,
            backgroundColor: AppColors.leafPale,
            child: const Icon(Icons.delivery_dining_rounded, color: AppColors.darkGreen, size: 28),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Delivery personnel',
                  style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
                const Text(
                  'One Source rider',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                ),
                Text(
                  city?.isNotEmpty == true ? 'Delivering to $city' : 'On the way to you',
                  style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
                ),
              ],
            ),
          ),
          Material(
            color: AppColors.darkGreen,
            shape: const CircleBorder(),
            child: InkWell(
              onTap: () {},
              customBorder: const CircleBorder(),
              child: const SizedBox(
                width: 44,
                height: 44,
                child: Icon(Icons.phone_rounded, color: Colors.white, size: 22),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _OrderItemCard extends StatelessWidget {
  const _OrderItemCard({required this.item, required this.status});

  final OrderItem item;
  final String status;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: softCardShadow,
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: ProductThumbnail(image: item.productImage, size: 72),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.productTitle,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                ),
                const SizedBox(height: 4),
                Text(
                  'Qty ${item.quantity}',
                  style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    _StatusBadge(status: status, compact: true),
                    const Spacer(),
                    Text(
                      _currency.format(item.lineTotal),
                      style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.darkGreen),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status, this.compact = false});

  final String status;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final label = _labelFor(status);
    final color = _colorFor(status);

    return Container(
      padding: EdgeInsets.symmetric(horizontal: compact ? 8 : 12, vertical: compact ? 4 : 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: compact ? 10 : 12,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    );
  }

  String _labelFor(String s) {
    final n = s.toLowerCase().replaceAll(' ', '_');
    if (n.contains('deliver') && !n.contains('out_for')) return 'Delivered';
    if (n.contains('out_for') || n.contains('dispatch')) return 'Out for delivery';
    if (n.contains('confirm') || n.contains('ship')) return 'Shipped';
    return 'Processing';
  }

  Color _colorFor(String s) {
    final n = s.toLowerCase();
    if (n.contains('deliver') && !n.contains('out_for')) return AppColors.darkGreen;
    if (n.contains('out_for') || n.contains('dispatch')) return AppColors.deal;
    return AppColors.textMuted;
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow(this.label, this.value, {this.bold = false});

  final String label;
  final String value;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontWeight: bold ? FontWeight.w800 : FontWeight.w500,
              fontSize: bold ? 16 : 14,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: bold ? 17 : 14,
              color: bold ? AppColors.darkGreen : AppColors.text,
            ),
          ),
        ],
      ),
    );
  }
}
