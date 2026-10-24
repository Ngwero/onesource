import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../models/product.dart';
import '../utils/cart_feedback.dart';
import 'product_card_details.dart';
import 'product_checkout_actions.dart';
import 'product_image_zoom.dart';
import 'product_thumbnail.dart';
import 'rating_stars.dart';

class ProductCard extends ConsumerWidget {
  const ProductCard({
    super.key,
    required this.product,
    this.onAdd,
    this.showImageZoom = false,
  });

  final Product product;
  final VoidCallback? onAdd;

  /// Shows a zoom button on the photo. Used on the products list, where a tap
  /// on the card itself opens the product.
  final bool showImageZoom;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final category = ProductCardDetails.categoryLabel(product, context.tr);
    final social = ProductCardDetails.socialProof(product, context.tr);
    final stock = ProductCardDetails.stockLabel(product, context.tr);
    final isBestSeller = ProductCardDetails.isBestSeller(product);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppColors.cardRadius),
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
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      ProductThumbnail(
                        image: product.image,
                        size: 128,
                      ),
                      if (showImageZoom)
                        Positioned(
                          right: 0,
                          bottom: 0,
                          child: ProductCardZoomButton(images: product.gallery),
                        ),
                    ],
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
                              ProductBadge(
                                label: context.tr.get('productCard.bestSeller'),
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
                      context.tr.productTitle(product),
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
                    CardRating(product: product, size: 11),
                    const SizedBox(height: 8),
                    ProductPriceBlock(product: product, compact: true),
                    const SizedBox(height: 6),
                    ProductDeliveryRow(product: product, compact: true),
                    if (stock != null) ...[
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
                      ProductCheckoutActions(
                        inStock: product.inStock,
                        onAdd: onAdd!,
                        onPayNow: () => payNowAndCheckout(context, ref, product),
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
