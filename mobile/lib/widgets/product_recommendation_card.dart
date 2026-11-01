import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../models/product.dart';
import '../providers/currency_provider.dart';
import 'product_card_details.dart';
import 'product_thumbnail.dart';
import 'rating_stars.dart';

/// Compact recommendation tile. Checkout actions live on the product details page.
class ProductRecommendationCard extends ConsumerWidget {
  const ProductRecommendationCard({
    super.key,
    required this.product,
    this.onAdd,
  });

  final Product product;
  // Checkout lives on the product details page.
  // ignore: unused_field
  final VoidCallback? onAdd;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unit = ProductCardDetails.unitLabel(product, context.tr);
    final formatPrice = ref.watch(formatPriceProvider);

    return Container(
      width: 168,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
      ),
      clipBehavior: Clip.antiAlias,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => context.push('/product/${product.id}'),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(10, 10, 10, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(child: ProductThumbnail(image: product.image, size: 96)),
                const SizedBox(height: 8),
                Text(
                  context.tr.productTitle(product),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                    height: 1.25,
                  ),
                ),
                const SizedBox(height: 4),
                CardRating(product: product, size: 10),
                const SizedBox(height: 6),
                Text(
                  formatPrice(product.price),
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                    color: AppColors.darkGreen,
                  ),
                ),
                if (unit != null)
                  Text(
                    unit,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
