import 'package:flutter/material.dart';

import '../config/theme.dart';

/// Circular official brand mark (splash, auth, account).
class BrandLogoMark extends StatelessWidget {
  const BrandLogoMark({
    super.key,
    this.size = 72,
    this.showWordmark = false,
  });

  final double size;

  /// Kept for call-site compatibility; the official logo already includes the wordmark.
  final bool showWordmark;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: AppColors.darkGreen.withValues(alpha: 0.12),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipOval(
        child: ColoredBox(
          color: Colors.white,
          child: Padding(
            padding: EdgeInsets.all(size * 0.14),
            child: Image.asset(
              'assets/brand/logo-primary.png',
              fit: BoxFit.contain,
              errorBuilder: (_, __, ___) => Icon(
                Icons.eco_rounded,
                size: size * 0.45,
                color: AppColors.darkGreen,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class BrandLogo extends StatelessWidget {
  const BrandLogo({super.key, this.height = 40, this.onDark = false});

  final double height;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      'assets/brand/logo-primary.png',
      height: height,
      fit: BoxFit.contain,
      errorBuilder: (_, __, ___) => BrandLogoMark(size: height * 1.4),
    );
  }
}
