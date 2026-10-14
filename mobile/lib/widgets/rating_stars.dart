import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../models/product.dart';

final _countFormat = NumberFormat('#,##0');

class RatingStars extends StatelessWidget {
  const RatingStars({
    super.key,
    required this.rating,
    this.reviewCount,
    this.size = 14,
    this.color = AppColors.star,
  });

  final double rating;
  final int? reviewCount;
  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final halves = (rating.clamp(0, 5) * 2).round();
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        ...List.generate(5, (i) {
          final filled = halves >= (i + 1) * 2;
          final half = !filled && halves == i * 2 + 1;
          return Icon(
            filled
                ? Icons.star_rounded
                : half
                    ? Icons.star_half_rounded
                    : Icons.star_outline_rounded,
            size: size,
            color: color,
          );
        }),
        if (reviewCount != null) ...[
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              '(${_countFormat.format(reviewCount)})',
              maxLines: 1,
              style: TextStyle(fontSize: size - 2, color: AppColors.textMuted),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ],
    );
  }
}

/// One-line star row for product cards. Only products with real reviews
/// (details.ratingSource) get filled stars; the rest show grey stars + "No reviews yet".
class CardRating extends StatelessWidget {
  const CardRating({super.key, required this.product, this.size = 12});

  final Product product;
  final double size;

  @override
  Widget build(BuildContext context) {
    final verified = product.hasVerifiedRating;
    return SizedBox(
      height: size + 2,
      child: verified
          ? RatingStars(rating: product.rating, reviewCount: product.reviewCount, size: size)
          : Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                RatingStars(rating: 0, size: size, color: AppColors.textMuted.withValues(alpha: 0.45)),
                const SizedBox(width: 4),
                Flexible(
                  child: Text(
                    context.tr.get('productCard.noReviews'),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: size - 2, color: AppColors.textMuted),
                  ),
                ),
              ],
            ),
    );
  }
}
