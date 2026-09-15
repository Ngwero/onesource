import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
    final bottomNavClearance =
        MediaQuery.viewPaddingOf(context).bottom + 100;

    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: items.isEmpty
          ? Column(
              children: [
                const _CartHeader(count: 0),
                Expanded(child: _EmptyCart(onShop: () => context.go('/shop'))),
              ],
            )
          : Column(
              children: [
                _CartHeader(count: items.length),
                Expanded(
                  child: CustomScrollView(
                    physics: const BouncingScrollPhysics(
                      parent: AlwaysScrollableScrollPhysics(),
                    ),
                    slivers: [
                      SliverPadding(
                        padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
                        sliver: SliverToBoxAdapter(
                          child: FreeDeliveryBar(subtotal: subtotal),
                        ),
                      ),
                      SliverPadding(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                        sliver: SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              final item = items[index];
                              return CartLineItem(
                                key: ValueKey(item.product.id),
                                item: item,
                                onQuantityChanged: (qty) {
                                  HapticFeedback.selectionClick();
                                  if (qty <= 0) {
                                    ref
                                        .read(cartProvider.notifier)
                                        .remove(item.product.id);
                                  } else {
                                    ref
                                        .read(cartProvider.notifier)
                                        .setQuantity(item.product.id, qty);
                                  }
                                },
                                onRemove: () {
                                  HapticFeedback.lightImpact();
                                  ref
                                      .read(cartProvider.notifier)
                                      .remove(item.product.id);
                                },
                              );
                            },
                            childCount: items.length,
                          ),
                        ),
                      ),
                      SliverPadding(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
                        sliver: SliverToBoxAdapter(
                          child: _PromoField(controller: _promoController),
                        ),
                      ),
                    ],
                  ),
                ),
                _StickyCheckoutBar(
                  subtotal: subtotal,
                  delivery: totals.delivery,
                  total: totals.total,
                  bottomInset: bottomNavClearance,
                  onCheckout: () {
                    HapticFeedback.mediumImpact();
                    context.push('/checkout');
                  },
                ),
              ],
            ),
    );
  }
}

class _CartHeader extends StatelessWidget {
  const _CartHeader({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, top + 8, 20, 12),
      child: Row(
        children: [
          const Expanded(
            child: Text(
              'Your cart',
              style: TextStyle(
                fontFamily: 'Gabarito',
                fontSize: 28,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.8,
                color: AppColors.text,
              ),
            ),
          ),
          if (count > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.darkGreen,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                '$count ${count == 1 ? 'item' : 'items'}',
                style: const TextStyle(
                  fontFamily: 'Gabarito',
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _EmptyCart extends StatelessWidget {
  const _EmptyCart({required this.onShop});

  final VoidCallback onShop;

  static const _imageUrl =
      'https://images.unsplash.com/photo-1550989460-0adf9ea7628c?w=800&h=800&fit=crop';

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(32, 12, 32, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 220,
              height: 220,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    width: 220,
                    height: 220,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(
                        colors: [
                          AppColors.lemonGreen.withValues(alpha: 0.35),
                          AppColors.leafPale.withValues(alpha: 0.5),
                          Colors.transparent,
                        ],
                      ),
                    ),
                  ),
                  Container(
                    width: 168,
                    height: 168,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.darkGreen.withValues(alpha: 0.18),
                          blurRadius: 28,
                          offset: const Offset(0, 14),
                        ),
                      ],
                    ),
                    child: ClipOval(
                      child: Image.network(
                        _imageUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => ColoredBox(
                          color: AppColors.leafPale,
                          child: Icon(
                            Icons.shopping_cart_outlined,
                            size: 56,
                            color: AppColors.darkGreen.withValues(alpha: 0.55),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),
            const Text(
              'Nothing here yet',
              style: TextStyle(
                fontFamily: 'Gabarito',
                fontSize: 22,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.4,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Add fresh produce and kitchen ware —\none basket, one delivery.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: 'Gabarito',
                fontSize: 15,
                height: 1.45,
                color: AppColors.textMuted.withValues(alpha: 0.95),
              ),
            ),
            const SizedBox(height: 28),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: onShop,
                style: FilledButton.styleFrom(
                  minimumSize: const Size(200, 52),
                  backgroundColor: AppColors.darkGreen,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(28),
                  ),
                ),
                child: const Text(
                  'Start shopping',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PromoField extends StatelessWidget {
  const _PromoField({required this.controller});

  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(6, 6, 6, 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border.withValues(alpha: 0.7)),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              style: const TextStyle(
                fontFamily: 'Gabarito',
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
              decoration: const InputDecoration(
                hintText: 'Promo code',
                hintStyle: TextStyle(
                  color: AppColors.textMuted,
                  fontWeight: FontWeight.w500,
                  fontSize: 14,
                ),
                border: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                isDense: true,
              ),
            ),
          ),
          TextButton(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Promo codes coming soon'),
                  behavior: SnackBarBehavior.floating,
                  backgroundColor: AppColors.darkGreen,
                ),
              );
            },
            style: TextButton.styleFrom(
              foregroundColor: AppColors.darkGreen,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            ),
            child: const Text(
              'Apply',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }
}

class _StickyCheckoutBar extends ConsumerWidget {
  const _StickyCheckoutBar({
    required this.subtotal,
    required this.delivery,
    required this.total,
    required this.bottomInset,
    required this.onCheckout,
  });

  final double subtotal;
  final int delivery;
  final double total;
  final double bottomInset;
  final VoidCallback onCheckout;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final formatPrice = ref.watch(formatPriceProvider);
    final free = delivery == 0;

    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(20, 14, 20, bottomInset),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.96),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 24,
            offset: const Offset(0, -8),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      free ? 'Free delivery' : 'Delivery ${formatPrice(delivery.toDouble())}',
                      style: TextStyle(
                        fontFamily: 'Gabarito',
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: free ? AppColors.darkGreen : AppColors.textMuted,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      formatPrice(total),
                      style: const TextStyle(
                        fontFamily: 'Gabarito',
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.5,
                        color: AppColors.text,
                      ),
                    ),
                    Text(
                      'Subtotal ${formatPrice(subtotal)}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              FilledButton(
                onPressed: onCheckout,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.darkGreen,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  // Theme default is Size.fromHeight(48) → infinite width; breaks Row layout.
                  minimumSize: const Size(0, 52),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Checkout',
                      style: TextStyle(
                        fontFamily: 'Gabarito',
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                      ),
                    ),
                    SizedBox(width: 6),
                    Icon(Icons.arrow_forward_rounded, size: 18),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
