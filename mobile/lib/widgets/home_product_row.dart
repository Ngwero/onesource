import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../data/home_rows.dart';
import '../i18n/app_strings.dart';
import '../models/product.dart';
import 'popular_product_card.dart';

/// Phone aisle-card size: wide enough for title + 44px plus/Pay now.
class ProductShelfLayout {
  static const cardWidth = 196.0;
  static const rowHeight = 340.0;
  static const imageSize = 132.0;
  static const gap = 12.0;
}

class HomeProductRow extends ConsumerWidget {
  const HomeProductRow({
    super.key,
    required this.row,
    required this.products,
    required this.onAdd,
  });

  final HomeRowConfig row;
  final List<Product> products;
  final void Function(Product product) onAdd;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (products.isEmpty) return const SizedBox.shrink();

    final strings = ref.watch(stringsProvider);
    final seeAll = homeRowSeeAllPath(row);
    final title = strings.homeRowTitle(row.id);
    final subtitle = strings.homeRowSubtitle(row.id);

    return Padding(
      padding: const EdgeInsets.only(bottom: 22),
      child: Column(
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
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: AppColors.text,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
                    ),
                  ],
                ),
              ),
              if (seeAll != null)
                TextButton(
                  onPressed: () => context.push(seeAll),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.darkGreen,
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: Text(strings.seeAll, style: const TextStyle(fontWeight: FontWeight.w700)),
                ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: ProductShelfLayout.rowHeight,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: products.length,
              separatorBuilder: (_, __) => const SizedBox(width: ProductShelfLayout.gap),
              itemBuilder: (context, index) {
                final product = products[index];
                return SizedBox(
                  width: ProductShelfLayout.cardWidth,
                  child: PopularProductCard(
                    product: product,
                    imageSize: ProductShelfLayout.imageSize,
                    onAdd: () => onAdd(product),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
