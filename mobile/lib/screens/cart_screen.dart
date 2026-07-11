import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../providers/cart_provider.dart';
import '../providers/currency_provider.dart';
import '../services/checkout.dart';
import '../widgets/cart_line_item.dart';
import '../widgets/free_delivery_bar.dart';

class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});

  @override
  ConsumerState<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends ConsumerState<CartScreen> {
  final _promoController = TextEditingController();

  @override
  void dispose() {
    _promoController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final items = ref.watch(cartProvider);
    final subtotal = ref.watch(cartSubtotalProvider);
    final totals = calcOrderTotal(subtotal);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: const Text('Your cart'),
        centerTitle: true,
        backgroundColor: AppColors.canvas,
        elevation: 0,
      ),
      body: items.isEmpty
          ? _EmptyCart(onShop: () => context.go('/shop'))
          : Column(
              children: [
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
                    children: [
                      Text(
                        '${items.length} item${items.length == 1 ? '' : 's'}',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textMuted,
                        ),
                      ),
                      const SizedBox(height: 12),
                      ...items.map(
                        (item) => CartLineItem(
                          item: item,
                          onQuantityChanged: (qty) {
                            if (qty <= 0) {
                              ref.read(cartProvider.notifier).remove(item.product.id);
                            } else {
                              ref.read(cartProvider.notifier).setQuantity(item.product.id, qty);
                            }
                          },
                          onRemove: () => ref.read(cartProvider.notifier).remove(item.product.id),
                        ),
                      ),
                    ],
                  ),
                ),
                _CartSummary(
                  promoController: _promoController,
                  subtotal: subtotal,
                  delivery: totals.delivery,
                  total: totals.total,
                  onCheckout: () => context.push('/checkout'),
                ),
              ],
            ),
    );
  }
}

class _EmptyCart extends StatelessWidget {
  const _EmptyCart({required this.onShop});

  final VoidCallback onShop;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                color: AppColors.leafPale,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.shopping_bag_outlined,
                size: 40,
                color: AppColors.darkGreen.withValues(alpha: 0.6),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Your cart is empty',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            const Text(
              'Add fresh produce to get started',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textMuted),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: onShop,
              style: FilledButton.styleFrom(
                minimumSize: const Size(200, 48),
                backgroundColor: AppColors.darkGreen,
              ),
              child: const Text('Start shopping'),
            ),
          ],
        ),
      ),
    );
  }
}

class _CartSummary extends ConsumerWidget {
  const _CartSummary({
    required this.promoController,
    required this.subtotal,
    required this.delivery,
    required this.total,
    required this.onCheckout,
  });

  final TextEditingController promoController;
  final double subtotal;
  final int delivery;
  final double total;
  final VoidCallback onCheckout;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final formatPrice = ref.watch(formatPriceProvider);
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 110),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: softCardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: promoController,
                  decoration: InputDecoration(
                    hintText: 'Promo code',
                    hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 14),
                    filled: true,
                    fillColor: AppColors.muted,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              OutlinedButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Promo codes coming soon'),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                },
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  side: const BorderSide(color: AppColors.border),
                ),
                child: const Text('Apply', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ],
          ),
          const SizedBox(height: 16),
          FreeDeliveryBar(subtotal: subtotal),
          const SizedBox(height: 14),
          _SummaryRow(label: 'Subtotal', value: formatPrice(subtotal)),
          _SummaryRow(
            label: 'Shipping fee',
            value: delivery == 0 ? 'FREE' : formatPrice(delivery.toDouble()),
          ),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 14),
            child: Divider(height: 1),
          ),
          _SummaryRow(label: 'Total', value: formatPrice(total), bold: true),
          const SizedBox(height: 18),
          SizedBox(
            height: 54,
            child: FilledButton(
              onPressed: onCheckout,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.darkGreen,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: const Text(
                'Proceed to payment',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.label, required this.value, this.bold = false});

  final String label;
  final String value;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontWeight: bold ? FontWeight.w800 : FontWeight.w500,
              fontSize: bold ? 16 : 14,
              color: bold ? AppColors.text : AppColors.textMuted,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: bold ? 18 : 14,
              color: bold ? AppColors.darkGreen : AppColors.text,
            ),
          ),
        ],
      ),
    );
  }
}
