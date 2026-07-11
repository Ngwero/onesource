import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../models/product.dart';
import '../providers/currency_provider.dart';
import 'product_card_details.dart';
import 'product_thumbnail.dart';

/// Compact product tile for home "Popular items" grid.
class PopularProductCard extends ConsumerWidget {
  const PopularProductCard({
    super.key,
    required this.product,
    this.onAdd,
  });

  final Product product;
  final VoidCallback? onAdd;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unit = ProductCardDetails.unitLabel(product);
    final formatPrice = ref.watch(formatPriceProvider);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: softCardShadow,
      ),
      clipBehavior: Clip.antiAlias,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => context.push('/product/${product.id}'),
          child: Stack(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Center(
                        child: ProductThumbnail(image: product.image, size: 108),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      product.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        height: 1.25,
                        color: AppColors.text,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      formatPrice(product.price),
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                        color: AppColors.darkGreen,
                      ),
                    ),
                    if (unit != null)
                      Text(
                        unit,
                        style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                      ),
                  ],
                ),
              ),
              if (onAdd != null)
                Positioned(
                  right: 10,
                  bottom: 10,
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: product.inStock ? onAdd : null,
                      customBorder: const CircleBorder(),
                      child: Ink(
                        width: 34,
                        height: 34,
                        decoration: BoxDecoration(
                          gradient: product.inStock ? AppGradients.brand : null,
                          color: product.inStock ? null : AppColors.muted,
                          shape: BoxShape.circle,
                          boxShadow: product.inStock
                              ? [
                                  BoxShadow(
                                    color: AppColors.darkGreen.withValues(alpha: 0.35),
                                    blurRadius: 8,
                                    offset: const Offset(0, 3),
                                  ),
                                ]
                              : null,
                        ),
                        child: const Icon(Icons.add, color: Colors.white, size: 20),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
