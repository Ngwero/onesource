import 'package:flutter/material.dart';

import '../config/theme.dart';
import '../models/product.dart';
import 'product_recommendation_card.dart';

class ProductRecommendationRow extends StatelessWidget {
  const ProductRecommendationRow({
    super.key,
    required this.title,
    required this.products,
    required this.onAdd,
    this.subtitle,
    this.viewAllLabel,
    this.onViewAll,
  });

  final String title;
  final String? subtitle;
  final List<Product> products;
  final void Function(Product product) onAdd;
  final String? viewAllLabel;
  final VoidCallback? onViewAll;

  @override
  Widget build(BuildContext context) {
    if (products.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      subtitle!,
                      style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                    ),
                  ],
                ],
              ),
            ),
            if (viewAllLabel != null && onViewAll != null)
              TextButton(
                onPressed: onViewAll,
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.darkGreen,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: Text(viewAllLabel!, style: const TextStyle(fontWeight: FontWeight.w700)),
              ),
          ],
        ),
        const SizedBox(height: 14),
        SizedBox(
          height: 268,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: products.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final product = products[index];
              return ProductRecommendationCard(
                product: product,
                onAdd: () => onAdd(product),
              );
            },
          ),
        ),
      ],
    );
  }
}
