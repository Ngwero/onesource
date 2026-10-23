import 'package:flutter/material.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';

/// Shared pair: plus adds to basket; Pay now adds and goes to checkout.
class ProductCheckoutActions extends StatelessWidget {
  const ProductCheckoutActions({
    super.key,
    required this.inStock,
    required this.onAdd,
    required this.onPayNow,
    this.widthFactor = 0.64,
    this.height = 36,
  });

  final bool inStock;
  final VoidCallback onAdd;
  final VoidCallback onPayNow;
  final double widthFactor;
  final double height;

  /// Same yellow as web `.product-card-basket-btn` / `.cos-checkout-*`.
  static const _yellow = Color(0xFFFFDF00);
  static const _yellowHover = Color(0xFFF7CA00);
  static const _ink = Color(0xFF0F1111);

  @override
  Widget build(BuildContext context) {
    Color resolveFill(Set<WidgetState> states) {
      if (states.contains(WidgetState.disabled)) return AppColors.muted;
      if (states.contains(WidgetState.pressed) || states.contains(WidgetState.hovered)) {
        return _yellowHover;
      }
      return _yellow;
    }

    final style = FilledButton.styleFrom(
      foregroundColor: _ink,
      disabledForegroundColor: AppColors.textMuted,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      minimumSize: Size(0, height),
      maximumSize: Size(double.infinity, height),
      shape: const StadiumBorder(),
      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
    ).copyWith(
      backgroundColor: WidgetStateProperty.resolveWith(resolveFill),
    );

    return Align(
      alignment: AlignmentDirectional.centerStart,
      child: FractionallySizedBox(
        widthFactor: widthFactor,
        child: SizedBox(
          height: height,
          child: Row(
            children: [
              SizedBox(
                width: height,
                height: height,
                child: IconButton.filled(
                  onPressed: inStock ? onAdd : null,
                  tooltip: context.tr.get('common.addToBasket'),
                  style: IconButton.styleFrom(
                    foregroundColor: _ink,
                    disabledBackgroundColor: AppColors.muted,
                    disabledForegroundColor: AppColors.textMuted,
                    padding: EdgeInsets.zero,
                    minimumSize: Size.square(height),
                    maximumSize: Size.square(height),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    shape: const CircleBorder(),
                  ).copyWith(
                    backgroundColor: WidgetStateProperty.resolveWith(resolveFill),
                  ),
                  icon: PlusIcon(size: height * 0.52),
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: FilledButton(
                  onPressed: inStock ? onPayNow : null,
                  style: style.copyWith(
                    textStyle: WidgetStatePropertyAll(
                      TextStyle(
                        fontSize: height >= 44 ? 14 : 11,
                        fontWeight: FontWeight.w700,
                        height: 1,
                        color: _ink,
                      ),
                    ),
                  ),
                  child: Text(
                    context.tr.get('product.payNow'),
                    maxLines: 2,
                    textAlign: TextAlign.center,
                    overflow: TextOverflow.ellipsis,
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

/// Filled plus matching Flaticon "Plus" 2952084 (twentyfour Glyph).
/// Official SVG is account-gated; this is an original solid recreation of that
/// silhouette (axis-aligned plus with square ends) from the free PNG
/// https://cdn-icons-png.flaticon.com/512/2952/2952084.png
/// Icon: https://www.flaticon.com/free-icon/plus_2952084
/// License: Flaticon free license — personal/commercial use with attribution.
class PlusIcon extends StatelessWidget {
  const PlusIcon({super.key, this.size = 18, this.color});

  final double size;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final resolved = color ?? IconTheme.of(context).color ?? const Color(0xFF0F1111);
    return CustomPaint(
      size: Size.square(size),
      painter: _PlusPainter(resolved),
    );
  }
}

class _PlusPainter extends CustomPainter {
  const _PlusPainter(this.color);

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.shortestSide / 24);

    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill
      ..isAntiAlias = true;

    canvas.drawPath(
      Path()
        ..moveTo(11.25, 3)
        ..lineTo(12.75, 3)
        ..lineTo(12.75, 11.25)
        ..lineTo(21, 11.25)
        ..lineTo(21, 12.75)
        ..lineTo(12.75, 12.75)
        ..lineTo(12.75, 21)
        ..lineTo(11.25, 21)
        ..lineTo(11.25, 12.75)
        ..lineTo(3, 12.75)
        ..lineTo(3, 11.25)
        ..lineTo(11.25, 11.25)
        ..close(),
      paint,
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _PlusPainter oldDelegate) => oldDelegate.color != color;
}

/// @deprecated Use [ProductCheckoutActions] — same shared plus + Pay now pair.
typedef CosmeticsCheckoutActions = ProductCheckoutActions;
