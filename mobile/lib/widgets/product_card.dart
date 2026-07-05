import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../models/product.dart';
import 'product_card_details.dart';
import 'product_thumbnail.dart';
import 'rating_stars.dart';

class ProductCard extends StatelessWidget {
  const ProductCard({
    super.key,
    required this.product,
    this.onAdd,
  });

  final Product product;
  final VoidCallback? onAdd;

  @override
  Widget build(BuildContext context) {
    final category = ProductCardDetails.categoryLabel(product);
    final social = ProductCardDetails.socialProof(product);
    final stock = ProductCardDetails.stockLabel(product);
    final isBestSeller = ProductCardDetails.isBestSeller(product);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppColors.cardRadius),
        border: Border.all(color: AppColors.border.withValues(alpha: 0.8)),
        boxShadow: softCardShadow,
      ),
      clipBehavior: Clip.antiAlias,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => context.push('/product/${product.id}'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 10, 10, 0),
                child: Row(
                  children: [
                    if (category.isNotEmpty)
                      Expanded(
                        child: Text(
                          category,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textMuted,
                            letterSpacing: 0.3,
                          ),
                        ),
                      ),
                    if (product.prime) const PrimeBadge(compact: true),
                  ],
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  child: Center(
                    child: ProductThumbnail(
                      image: product.image,
                      size: 128,
                    ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (isBestSeller || social.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            if (isBestSeller)
                              const ProductBadge(
                                label: 'Best seller',
                                background: AppColors.amber,
                                foreground: AppColors.text,
                                compact: true,
                              ),
                            if (social.isNotEmpty)
                              ProductBadge(
                                label: social,
                                compact: true,
                              ),
                          ],
                        ),
                      ),
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
                    RatingStars(rating: product.rating, reviewCount: product.reviewCount, size: 11),
                    const SizedBox(height: 8),
                    ProductPriceBlock(product: product, compact: true),
                    const SizedBox(height: 6),
                    ProductDeliveryRow(product: product, compact: true),
                    if (stock != null && stock != 'In stock') ...[
                      const SizedBox(height: 4),
                      Text(
                        stock,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: product.inStock ? AppColors.deal : AppColors.textMuted,
                        ),
                      ),
                    ],
                    if (onAdd != null) ...[
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        height: 36,
                        child: FilledButton.icon(
                          onPressed: product.inStock ? onAdd : null,
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.darkGreen,
                            disabledBackgroundColor: AppColors.muted,
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
                          ),
                          icon: const Icon(Icons.add_shopping_cart_outlined, size: 16),
                          label: Text(product.inStock ? 'Add to basket' : 'Unavailable'),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
