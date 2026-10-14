import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';

/// One Source branded Lottie loader. Holds a static frame when the platform
/// asks for reduced motion.
class BrandLoader extends StatelessWidget {
  const BrandLoader({
    super.key,
    this.size = 72,
    this.onDark = false,
    this.semanticLabel,
    this.excludeSemantics = false,
  });

  static const asset = 'assets/lottie/onesource-loader.json';

  final double size;

  /// The animation is pure white; unless the surface is already dark it is
  /// drawn inside a brand-green badge so it stays visible.
  final bool onDark;
  final String? semanticLabel;

  /// Set when a surrounding widget already announces the loading state.
  final bool excludeSemantics;

  @override
  Widget build(BuildContext context) {
    final animate = !MediaQuery.disableAnimationsOf(context);
    final Widget animation = Lottie.asset(
      asset,
      animate: animate,
      repeat: true,
      fit: BoxFit.contain,
      // Parse off the UI isolate so a bad or heavy file can't freeze launch.
      backgroundLoading: true,
      errorBuilder: (_, __, ___) => Padding(
        padding: EdgeInsets.all(size * 0.2),
        child: const CircularProgressIndicator(
          strokeWidth: 2.5,
          color: Colors.white,
          backgroundColor: Color(0x47FFFFFF),
        ),
      ),
    );
    final loader = onDark
        ? SizedBox.square(dimension: size, child: animation)
        : Container(
            width: size,
            height: size,
            padding: EdgeInsets.all(size * 0.16),
            decoration: const BoxDecoration(
              color: AppColors.darkGreen,
              shape: BoxShape.circle,
            ),
            child: animation,
          );
    if (excludeSemantics) return ExcludeSemantics(child: loader);
    return Semantics(
      label: semanticLabel ?? context.tr.get('common.loading'),
      liveRegion: true,
      child: ExcludeSemantics(child: loader),
    );
  }
}
