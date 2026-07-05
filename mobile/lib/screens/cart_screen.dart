import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../config/theme.dart';
import '../providers/cart_provider.dart';
import '../services/checkout.dart';
import '../widgets/free_delivery_bar.dart';
import '../widgets/horizontal_product_card.dart';

final _currency = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);

class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(cartProvider);
    final subtotal = ref.watch(cartSubtotalProvider);
    final totals = calcOrderTotal(subtotal);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(title: const Text('Your basket')),
      body: items.isEmpty
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.shopping_bag_outlined, size: 64, color: AppColors.textMuted.withValues(alpha: 0.5)),
                  const SizedBox(height: 12),
                  const Text('Your basket is empty', style: TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 16),
                  FilledButton(onPressed: () => context.go('/shop'), child: const Text('Start shopping')),
                ],
              ),
            )
          : Column(
              children: [
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
                    itemCount: items.length,
                    itemBuilder: (context, index) {
                      final item = items[index];
                      return HorizontalProductCard(
                        product: item.product,
                        quantity: item.quantity,
                        onQuantityChanged: (qty) {
                          if (qty <= 0) {
                            ref.read(cartProvider.notifier).remove(item.product.id);
                          } else {
                            ref.read(cartProvider.notifier).setQuantity(item.product.id, qty);
                          }
                        },
                      );
                    },
                  ),
                ),
                Container(
                  margin: const EdgeInsets.fromLTRB(20, 0, 20, 100),
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: softCardShadow,
                  ),
                  child: Column(
                    children: [
                      FreeDeliveryBar(subtotal: subtotal),
                      const SizedBox(height: 12),
                      _row('Subtotal', _currency.format(subtotal)),
                      _row('Delivery', totals.delivery == 0 ? 'FREE' : _currency.format(totals.delivery)),
                      const Divider(height: 24),
                      _row('Total', _currency.format(totals.total), bold: true),
                      const SizedBox(height: 14),
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: FilledButton(
                          onPressed: () => context.push('/checkout'),
                          child: const Text('Checkout'),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  Widget _row(String label, String value, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontWeight: bold ? FontWeight.w800 : FontWeight.w500)),
          Text(value, style: TextStyle(fontWeight: bold ? FontWeight.w800 : FontWeight.w600)),
        ],
      ),
    );
  }
}
