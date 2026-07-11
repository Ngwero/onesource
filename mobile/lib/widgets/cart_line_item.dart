import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../models/cart_item.dart';
import '../providers/currency_provider.dart';
import 'product_thumbnail.dart';
import 'quantity_stepper.dart';

/// Compact cart row — image, title, price, qty controls, remove.
class CartLineItem extends ConsumerWidget {
  const CartLineItem({
    super.key,
    required this.item,
    required this.onQuantityChanged,
    required this.onRemove,
  });

  final CartItem item;
  final ValueChanged<int> onQuantityChanged;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final product = item.product;
    final formatPrice = ref.watch(formatPriceProvider);

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: softCardShadow,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onTap: () => context.push('/product/${product.id}'),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: ColoredBox(
                color: AppColors.muted,
                child: ProductThumbnail(image: product.image, size: 88),
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () => context.push('/product/${product.id}'),
                        child: Text(
                          product.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                            height: 1.25,
                          ),
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: onRemove,
                      icon: const Icon(Icons.delete_outline_rounded, size: 20),
                      color: AppColors.textMuted,
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                    ),
                  ],
                ),
                if (product.unit.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      'Per ${product.unit}',
                      style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                    ),
                  ),
                const SizedBox(height: 10),
                Text(
                  formatPrice(item.lineTotal),
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                    color: AppColors.darkGreen,
                  ),
                ),
                const SizedBox(height: 12),
                QuantityStepper(
                  quantity: item.quantity,
                  compact: true,
                  min: 1,
                  onChanged: onQuantityChanged,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
