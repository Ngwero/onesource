import 'package:flutter/material.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';

/// Shared pair: Add to basket adds the product; Buy now adds and goes to checkout.
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

  @override
  Widget build(BuildContext context) {
    ButtonStyle actionStyle({required bool basket}) {
      return FilledButton.styleFrom(
        foregroundColor: basket ? Colors.white : AppColors.text,
        disabledForegroundColor: AppColors.textMuted,
        padding: const EdgeInsets.symmetric(horizontal: 6),
        minimumSize: Size(0, height),
        maximumSize: Size(double.infinity, height),
        shape: const StadiumBorder(),
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ).copyWith(
        backgroundColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.disabled)) return AppColors.muted;
          final active = states.contains(WidgetState.pressed) ||
              states.contains(WidgetState.hovered);
          if (basket) return active ? AppColors.accentHover : AppColors.accent;
          return active ? const Color(0xFFE5BC3D) : AppColors.highlight;
        }),
      );
    }

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
                  style: actionStyle(basket: true).copyWith(
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
                  style: actionStyle(basket: false).copyWith(
                    textStyle: WidgetStatePropertyAll(
                      TextStyle(
                        fontSize: height >= 44 ? 12 : 11,
                        fontWeight: FontWeight.w700,
                        height: 1,
                      ),
                    ),
                  ),
                  child: Text(
                    context.tr.get('common.buyNow'),
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
