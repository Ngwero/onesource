import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../models/cart_item.dart';
import '../providers/currency_provider.dart';
import 'product_thumbnail.dart';
import 'quantity_stepper.dart';

/// Modern cart row — soft tile, cover image, inline qty pill.
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

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => context.push('/product/${product.id}'),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: ColoredBox(
                    color: AppColors.leafPale,
                    child: ProductThumbnail(
                      image: product.image,
                      size: 84,
                      fit: BoxFit.cover,
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
                            child: Text(
                              product.title,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontFamily: 'Gabarito',
                                fontWeight: FontWeight.w700,
                                fontSize: 15,
                                height: 1.25,
                                letterSpacing: -0.2,
                              ),
                            ),
                          ),
                          const SizedBox(width: 4),
                          GestureDetector(
                            onTap: onRemove,
                            behavior: HitTestBehavior.opaque,
                            child: Padding(
                              padding: const EdgeInsets.all(4),
                              child: Icon(
                                Icons.close_rounded,
                                size: 18,
                                color: AppColors.textMuted.withValues(alpha: 0.8),
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (product.unit.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          product.unit,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ],
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Text(
                            formatPrice(item.lineTotal),
                            style: const TextStyle(
                              fontFamily: 'Gabarito',
                              fontWeight: FontWeight.w800,
                              fontSize: 16,
                              letterSpacing: -0.3,
                              color: AppColors.darkGreen,
                            ),
                          ),
                          const Spacer(),
                          QuantityStepper(
                            quantity: item.quantity,
                            compact: true,
                            min: 1,
                            onChanged: onQuantityChanged,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
