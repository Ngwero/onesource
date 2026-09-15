import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../config/theme.dart';
import '../services/image_url.dart';

/// Product image thumbnail with sized decode for long lists.
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
        child: ColoredBox(
          color: AppColors.muted,
          child: Icon(
            Icons.local_florist_outlined,
            color: AppColors.accent,
            size: size * 0.38,
          ),
        ),
      );
    }

    final dpr = MediaQuery.devicePixelRatioOf(context);
    final cachePx = (size * dpr).round().clamp(96, 512);

    return SizedBox(
      width: size,
      height: size,
      child: CachedNetworkImage(
        imageUrl: imageUrl,
        fit: fit,
        width: size,
        height: size,
        // Width-only cache keeps aspect correct; height-only square decode can blank some assets.
        memCacheWidth: cachePx,
        maxWidthDiskCache: cachePx * 2,
        fadeInDuration: const Duration(milliseconds: 150),
        placeholder: (_, __) => ColoredBox(
          color: AppColors.leafPale,
          child: Center(
            child: SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppColors.darkGreen.withValues(alpha: 0.55),
              ),
            ),
          ),
        ),
        errorWidget: (_, url, error) => ColoredBox(
          color: AppColors.leafPale,
          child: Icon(
            Icons.image_not_supported_outlined,
            color: AppColors.textMuted,
            size: size * 0.32,
          ),
        ),
      ),
    );
  }
}
