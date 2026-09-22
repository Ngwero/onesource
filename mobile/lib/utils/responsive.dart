import 'package:flutter/material.dart';

/// Shared breakpoints for phone / tablet layouts.
abstract final class AppBreakpoints {
  static const double tablet = 600;
  static const double wide = 900;
  static const double contentMaxWidth = 1100;
}

bool isTablet(BuildContext context) =>
    MediaQuery.sizeOf(context).shortestSide >= AppBreakpoints.tablet;

bool isWideLayout(BuildContext context) =>
    MediaQuery.sizeOf(context).width >= AppBreakpoints.tablet;

int productGridCount(BuildContext context) {
  final w = MediaQuery.sizeOf(context).width;
  if (w >= 1100) return 4;
  if (w >= 700) return 3;
  return 2;
}

int categoryGridCount(BuildContext context) {
  final w = MediaQuery.sizeOf(context).width;
  if (w >= 1000) return 4;
  if (w >= 600) return 3;
  return 2;
}

/// Bottom padding under scroll content (nav bar on phone, slim on tablet rail).
double shellBottomPadding(BuildContext context) {
  final inset = MediaQuery.viewPaddingOf(context).bottom;
  return inset + (isWideLayout(context) ? 28 : 100);
}

/// Centers [child] and caps width on tablets / large phones in landscape.
class ContentWidth extends StatelessWidget {
  const ContentWidth({
    super.key,
    required this.child,
    this.maxWidth = AppBreakpoints.contentMaxWidth,
  });

  final Widget child;
  final double maxWidth;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: child,
      ),
    );
  }
}
