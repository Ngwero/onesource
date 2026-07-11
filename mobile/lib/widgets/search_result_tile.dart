import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../config/theme.dart';
import '../models/product.dart';
import '../utils/search_match.dart';
import 'product_card_details.dart';
import 'product_thumbnail.dart';

final _currency = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);

class SearchResultTile extends StatelessWidget {
  const SearchResultTile({
    super.key,
    required this.product,
    required this.query,
    this.onAdd,
  });

  final Product product;
  final String query;
  final VoidCallback? onAdd;

  @override
  Widget build(BuildContext context) {
    final category = ProductCardDetails.categoryLabel(product);

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/product/${product.id}'),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: ColoredBox(
                  color: AppColors.muted,
                  child: ProductThumbnail(image: product.image, size: 72),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (category.isNotEmpty)
                      Text(
                        category.toUpperCase(),
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.5,
                          color: AppColors.textMuted,
                        ),
                      ),
                    const SizedBox(height: 4),
                    _HighlightedText(text: product.title, query: query),
                    const SizedBox(height: 6),
                    Text(
                      _currency.format(product.price),
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                        color: AppColors.darkGreen,
                      ),
                    ),
                  ],
                ),
              ),
              if (onAdd != null)
                Material(
                  color: AppColors.darkGreen,
                  shape: const CircleBorder(),
                  child: InkWell(
                    onTap: product.inStock ? onAdd : null,
                    customBorder: const CircleBorder(),
                    child: const SizedBox(
                      width: 40,
                      height: 40,
                      child: Icon(Icons.add, color: Colors.white, size: 22),
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

class _HighlightedText extends StatelessWidget {
  const _HighlightedText({required this.text, required this.query});

  final String text;
  final String query;

  @override
  Widget build(BuildContext context) {
    final q = query.trim().toLowerCase();
    if (q.length < 2) {
      return Text(
        text,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, height: 1.25),
      );
    }

    final lower = text.toLowerCase();
    final matchVariant = queryVariants(query).firstWhere(
      (v) => v.length >= 2 && lower.contains(v),
      orElse: () => q,
    );
    final index = lower.indexOf(matchVariant);
    if (index < 0) {
      return Text(
        text,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, height: 1.25),
      );
    }

    final before = text.substring(0, index);
    final match = text.substring(index, index + matchVariant.length);
    final after = text.substring(index + matchVariant.length);

    return RichText(
      maxLines: 2,
      overflow: TextOverflow.ellipsis,
      text: TextSpan(
        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, height: 1.25, color: AppColors.text),
        children: [
          TextSpan(text: before),
          TextSpan(
            text: match,
            style: const TextStyle(color: AppColors.darkGreen, fontWeight: FontWeight.w800),
          ),
          TextSpan(text: after),
        ],
      ),
    );
  }
}
