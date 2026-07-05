import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../config/theme.dart';
import '../services/image_url.dart';

/// Clean product image — no pad, border, or background.
class ProductThumbnail extends StatelessWidget {
  const ProductThumbnail({
    super.key,
    required this.image,
    this.size = 88,
    this.fit = BoxFit.contain,
  });

  final String image;
  final double size;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    final imageUrl = resolveImageUrl(image);

    if (imageUrl.isEmpty) {
      return SizedBox(
        width: size,
        height: size,
        child: Icon(Icons.local_florist_outlined, color: AppColors.accent, size: size * 0.38),
      );
    }

    return SizedBox(
      width: size,
      height: size,
      child: CachedNetworkImage(
        imageUrl: imageUrl,
        fit: fit,
        placeholder: (_, __) => const Center(
          child: SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.accent),
          ),
        ),
        errorWidget: (_, __, ___) =>
            Icon(Icons.image_not_supported_outlined, color: AppColors.textMuted, size: size * 0.3),
      ),
    );
  }
}
