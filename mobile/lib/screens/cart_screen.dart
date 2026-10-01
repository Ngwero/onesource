import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../providers/cart_provider.dart';
import '../providers/currency_provider.dart';
import '../services/checkout.dart';
import '../utils/responsive.dart';
import '../widgets/cart_line_item.dart';
import '../widgets/free_delivery_bar.dart';
import 'exports_screens.dart' show isExportProduct;

class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});

  @override
  ConsumerState<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends ConsumerState<CartScreen> {
  @override
  Widget build(BuildContext context) {
    final items = ref.watch(cartProvider);
    final subtotal = ref.watch(cartSubtotalProvider);
    final totals = calcOrderTotal(subtotal);
    final bottomNavClearance = shellBottomPadding(context);

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
                    final exportOnly = items.every((i) => isExportProduct(i.product));
                    context.push(exportOnly ? '/exports/confirmation' : '/checkout');
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
          Expanded(
            child: Text(
              context.tr.get('cart.title'),
              style: const TextStyle(
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
                '$count ${context.tr.get(count == 1 ? 'common.item' : 'common.items')}',
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
    final s = context.tr;
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
            Text(
              s.get('cart.emptyTitle'),
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontFamily: 'Gabarito',
                fontSize: 22,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.4,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              s.get('app.cart.emptyText'),
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
                child: Text(
                  s.get('common.shopNow'),
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                ),
              ),
            ),
          ],
        ),
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
    final s = context.tr;

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
                      free
                          ? s.get('cart.freeSameDay')
                          : '${s.get('cart.delivery')} ${formatPrice(delivery.toDouble())}',
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
                      '${s.get('cart.subtotal')} ${formatPrice(subtotal)}',
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
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      s.get('checkout.title'),
                      style: const TextStyle(
                        fontFamily: 'Gabarito',
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(width: 6),
                    const Icon(Icons.arrow_forward_rounded, size: 18),
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
