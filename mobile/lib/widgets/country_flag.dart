import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../i18n/country_defaults.dart';

/// Country flag (ISO 3166-1 alpha-2) cropped into a circle, with an emoji
/// fallback offline. Decorative: pair it with the country name in text.
class CountryFlag extends StatelessWidget {
  const CountryFlag({super.key, required this.code, this.size = 18});

  final String code;
  final double size;

  @override
  Widget build(BuildContext context) {
    final upper = code.toUpperCase();
    final emoji = Center(
      child: Text(
        countryFlagEmoji(upper),
        style: TextStyle(fontSize: size * 0.8, height: 1),
      ),
    );
    return ExcludeSemantics(
      child: Container(
        width: size,
        height: size,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: const Color(0xFFF1F1F1),
          border: Border.all(color: Colors.black.withValues(alpha: 0.1)),
        ),
        child: isCountryCode(upper)
            ? CachedNetworkImage(
                imageUrl: 'https://flagcdn.com/w80/${upper.toLowerCase()}.png',
                fit: BoxFit.cover,
                width: size,
                height: size,
                memCacheWidth: (size * 4).round(),
                fadeInDuration: const Duration(milliseconds: 120),
                placeholder: (_, __) => const SizedBox.shrink(),
                errorWidget: (_, __, ___) => emoji,
              )
            : emoji,
      ),
    );
  }
}
