import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../models/product.dart';
import 'product_card_details.dart';
import 'product_thumbnail.dart';
import 'quantity_stepper.dart';
import 'rating_stars.dart';

class HorizontalProductCard extends StatelessWidget {
  const HorizontalProductCard({
    super.key,
    required this.product,
    this.onBuy,
    this.onQuantityChanged,
    this.quantity,
  });

  final Product product;
  final VoidCallback? onBuy;
  final int? quantity;
  final ValueChanged<int>? onQuantityChanged;

  @override
  Widget build(BuildContext context) {
    final category = ProductCardDetails.categoryLabel(product);
    final desc = product.description.trim();
    final subtitle = desc.isNotEmpty
        ? desc
        : 'Fresh quality produce from One Source.';
    final social = ProductCardDetails.socialProof(product);
    final stock = ProductCardDetails.stockLabel(product);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border.withValues(alpha: 0.8)),
        boxShadow: softCardShadow,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () => context.push('/product/${product.id}'),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ProductThumbnail(image: product.image, size: 136),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          if (category.isNotEmpty)
                            Expanded(
                              child: Text(
                                category.toUpperCase(),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.6,
                                  color: AppColors.textMuted,
                                ),
                              ),
                            ),
                          if (product.prime) const PrimeBadge(compact: true),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        product.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, height: 1.25),
                      ),
                      const SizedBox(height: 6),
                      RatingStars(rating: product.rating, reviewCount: product.reviewCount, size: 12),
                      const SizedBox(height: 6),
                      Text(
                        subtitle,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12, height: 1.35, color: AppColors.textMuted),
                      ),
                      if (social.isNotEmpty || ProductCardDetails.isBestSeller(product)) ...[
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            if (ProductCardDetails.isBestSeller(product))
                              const ProductBadge(
                                label: 'Best seller',
                                background: AppColors.amber,
                                foreground: AppColors.text,
                                compact: true,
                              ),
                            if (social.isNotEmpty) ProductBadge(label: social, compact: true),
                          ],
                        ),
                      ],
                      const SizedBox(height: 10),
                      ProductPriceBlock(product: product),
                      const SizedBox(height: 8),
                      ProductDeliveryRow(product: product),
                      if (stock != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          stock,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: product.inStock ? AppColors.darkGreen : AppColors.deal,
                          ),
                        ),
                      ],
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          if (quantity != null && onQuantityChanged != null)
                            QuantityStepper(
                              quantity: quantity!,
                              compact: true,
                              onChanged: onQuantityChanged!,
                            )
                          else if (onBuy != null)
                            Expanded(
                              child: SizedBox(
                                height: 40,
                                child: FilledButton.icon(
                                  onPressed: product.inStock ? onBuy : null,
                                  style: FilledButton.styleFrom(
                                    backgroundColor: AppColors.darkGreen,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                  icon: const Icon(Icons.add_shopping_cart_outlined, size: 18),
                                  label: Text(product.inStock ? 'Add to basket' : 'Unavailable'),
                                ),
                              ),
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
