import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../config/theme.dart';
import '../models/product.dart';
import '../providers/cart_provider.dart';
import '../providers/products_provider.dart';
import '../widgets/horizontal_product_card.dart';
import '../widgets/loading_view.dart';
import '../widgets/product_thumbnail.dart';
import '../widgets/quantity_stepper.dart';
import '../widgets/rating_stars.dart';

final _currency = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);

class ProductDetailScreen extends ConsumerStatefulWidget {
  const ProductDetailScreen({super.key, required this.productId});

  final String productId;

  @override
  ConsumerState<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends ConsumerState<ProductDetailScreen> {
  int _qty = 1;

  @override
  Widget build(BuildContext context) {
    final productAsync = ref.watch(productProvider(widget.productId));
    final allProductsAsync = ref.watch(productsProvider);
    final cartQty = ref
        .watch(cartProvider)
        .where((i) => i.product.id == widget.productId)
        .fold(0, (s, i) => s + i.quantity);

    return productAsync.when(
      loading: () => const Scaffold(backgroundColor: AppColors.canvas, body: LoadingView()),
      error: (e, _) => Scaffold(appBar: AppBar(), body: Center(child: Text(e.toString()))),
      data: (product) {
        if (product == null) {
          return Scaffold(appBar: AppBar(), body: const Center(child: Text('Product not found')));
        }

        final related = allProductsAsync.value
                ?.where((p) => p.category == product.category && p.id != product.id)
                .take(6)
                .toList() ??
            [];
        final discount = product.originalPrice != null && product.originalPrice! > product.price
            ? (((product.originalPrice! - product.price) / product.originalPrice!) * 100).round()
            : null;
        final maxQty = product.stockQuantity ?? 99;

        return Scaffold(
          backgroundColor: AppColors.canvas,
          appBar: AppBar(
            title: const Text('Details'),
            actions: [
              IconButton(
                icon: Badge(
                  isLabelVisible: cartQty > 0,
                  label: Text('$cartQty'),
                  child: const Icon(Icons.shopping_bag_outlined),
                ),
                onPressed: () => context.go('/cart'),
              ),
            ],
          ),
          bottomNavigationBar: _StickyBuyBar(
            product: product,
            quantity: _qty,
            maxQty: maxQty,
            onQuantityChanged: (q) => setState(() => _qty = q),
            onAdd: () {
              ref.read(cartProvider.notifier).add(product, quantity: _qty);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('$_qty × ${product.title} added'),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
          ),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: softCardShadow,
                ),
                child: Column(
                  children: [
                    Stack(
                      children: [
                        Center(
                          child: ProductThumbnail(
                            image: product.image,
                            size: 300,
                          ),
                        ),
                        if (discount != null)
                          Positioned(
                            top: 0,
                            left: 0,
                            child: Chip(
                              label: Text('-$discount%'),
                              backgroundColor: AppColors.deal,
                              labelStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              if (product.prime)
                Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: AppColors.accent,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text('Prime delivery', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
                ),
              Text(product.title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, height: 1.25)),
              if (product.supplierName != null && product.supplierName!.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  'Sold by ${product.supplierName}',
                  style: TextStyle(fontSize: 14, color: Colors.grey.shade700, fontWeight: FontWeight.w500),
                ),
              ],
              const SizedBox(height: 8),
              RatingStars(rating: product.rating, reviewCount: product.reviewCount),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    _currency.format(product.price),
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.accent),
                  ),
                  if (product.originalPrice != null && product.originalPrice! > product.price) ...[
                    const SizedBox(width: 10),
                    Text(
                      _currency.format(product.originalPrice),
                      style: const TextStyle(fontSize: 15, color: AppColors.textMuted, decoration: TextDecoration.lineThrough),
                    ),
                  ],
                ],
              ),
              if (product.unit.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text('Per ${product.unit}', style: const TextStyle(color: AppColors.textMuted)),
                ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: softCardShadow,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('About', style: TextStyle(fontWeight: FontWeight.w800)),
                    const SizedBox(height: 8),
                    Text(
                      product.description.isNotEmpty ? product.description : 'Fresh quality produce from One Source.',
                      style: const TextStyle(height: 1.5, color: AppColors.textMuted),
                    ),
                  ],
                ),
              ),
              if (related.isNotEmpty) ...[
                const SizedBox(height: 24),
                const Text('You may also like', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                const SizedBox(height: 8),
                ...related.map(
                  (p) => HorizontalProductCard(
                    product: p,
                    onBuy: () => ref.read(cartProvider.notifier).add(p),
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _StickyBuyBar extends StatelessWidget {
  const _StickyBuyBar({
    required this.product,
    required this.quantity,
    required this.maxQty,
    required this.onQuantityChanged,
    required this.onAdd,
  });

  final Product product;
  final int quantity;
  final int maxQty;
  final ValueChanged<int> onQuantityChanged;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: softCardShadow,
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            QuantityStepper(
              quantity: quantity,
              min: 1,
              max: maxQty,
              compact: true,
              onChanged: onQuantityChanged,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: FilledButton(
                onPressed: product.inStock ? onAdd : null,
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                  backgroundColor: AppColors.darkGreen,
                ),
                child: Text(product.inStock ? 'Add · ${_currency.format(product.price * quantity)}' : 'Out of stock'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
