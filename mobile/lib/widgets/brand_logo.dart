import 'package:flutter/material.dart';

import '../config/theme.dart';

/// Circular brand mark + optional wordmark (splash & auth header).
class BrandLogoMark extends StatelessWidget {
  const BrandLogoMark({
    super.key,
    this.size = 72,
    this.showWordmark = false,
  });

  final double size;
  final bool showWordmark;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: AppColors.leafPale,
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.leafPale),
            boxShadow: [
              BoxShadow(
                color: AppColors.darkGreen.withValues(alpha: 0.12),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          padding: EdgeInsets.all(size * 0.18),
          child: Image.asset(
            'assets/brand/logo-icon.png',
            fit: BoxFit.contain,
            errorBuilder: (_, __, ___) => Icon(
              Icons.eco_rounded,
              size: size * 0.45,
              color: AppColors.darkGreen,
            ),
          ),
        ),
        if (showWordmark) ...[
          SizedBox(height: size * 0.22),
          Image.asset(
            'assets/brand/logo-primary.png',
            height: size * 0.42,
            fit: BoxFit.contain,
            errorBuilder: (_, __, ___) => Text(
              'One Source',
              style: TextStyle(
                fontSize: size * 0.26,
                fontWeight: FontWeight.w800,
                color: AppColors.darkGreen,
                letterSpacing: -0.3,
              ),
            ),
          ),
        ],
      ],
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
      errorBuilder: (_, __, ___) => BrandLogoMark(size: height * 1.4, showWordmark: true),
    );
  }
}
