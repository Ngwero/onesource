import 'package:flutter/material.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';

/// Shared pair: Add to basket adds the product; Pay now adds and goes to checkout.
class ProductCheckoutActions extends StatelessWidget {
  const ProductCheckoutActions({
    super.key,
    required this.inStock,
    required this.onAdd,
    required this.onPayNow,
    this.widthFactor = 1,
    this.height = 44,
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
      if (states.contains(WidgetState.pressed) ||
          states.contains(WidgetState.hovered)) {
        return _yellowHover;
      }
      return _yellow;
    }

    final style = FilledButton.styleFrom(
      foregroundColor: _ink,
      disabledForegroundColor: AppColors.textMuted,
      padding: const EdgeInsets.symmetric(horizontal: 6),
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
              Expanded(
                flex: 3,
                child: FilledButton(
                  onPressed: inStock ? onAdd : null,
                  style: style.copyWith(
                    textStyle: WidgetStatePropertyAll(
                      TextStyle(
                          fontSize: height >= 44 ? 12 : 11,
                          fontWeight: FontWeight.w700,
                          height: 1.1),
                    ),
                  ),
                  child: Text(
                    context.tr.get(
                        inStock ? 'common.addToBasket' : 'common.outOfStock'),
                    maxLines: 2,
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                flex: 2,
                child: FilledButton(
                  onPressed: inStock ? onPayNow : null,
                  style: style.copyWith(
                    textStyle: WidgetStatePropertyAll(
                      TextStyle(
                        fontSize: height >= 44 ? 12 : 11,
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

/// @deprecated Use [ProductCheckoutActions].
typedef CosmeticsCheckoutActions = ProductCheckoutActions;
