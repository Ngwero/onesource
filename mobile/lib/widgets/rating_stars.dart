import 'package:flutter/material.dart';

import '../config/theme.dart';

class RatingStars extends StatelessWidget {
  const RatingStars({
    super.key,
    required this.rating,
    this.reviewCount,
    this.size = 14,
  });

  final double rating;
  final int? reviewCount;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        ...List.generate(5, (i) {
          final filled = rating >= i + 1;
          final half = !filled && rating > i;
          return Icon(
            filled
                ? Icons.star_rounded
                : half
                    ? Icons.star_half_rounded
                    : Icons.star_outline_rounded,
            size: size,
            color: AppColors.highlight,
          );
        }),
        if (reviewCount != null) ...[
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              '($reviewCount)',
              style: TextStyle(fontSize: size - 2, color: AppColors.textMuted),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ],
    );
  }
}
