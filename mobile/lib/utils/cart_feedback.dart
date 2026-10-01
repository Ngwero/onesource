import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../models/product.dart';
import '../providers/cart_provider.dart';

/// Adds [product] to the basket and shows a translated confirmation.
void addToCartWithFeedback(
  BuildContext context,
  WidgetRef ref,
  Product product, {
  int quantity = 1,
}) {
  ref.read(cartProvider.notifier).add(product, quantity: quantity);
  final s = context.tr;
  final title = s.productTitle(product);
  final message = quantity > 1
      ? s.t('app.cart.addedQty', {'qty': quantity, 'title': title})
      : s.t('app.cart.added', {'title': title});
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Text(message, maxLines: 2, overflow: TextOverflow.ellipsis),
        behavior: SnackBarBehavior.floating,
        backgroundColor: AppColors.darkGreen,
        action: SnackBarAction(
          label: s.get('common.view'),
          textColor: AppColors.lemonGreen,
          onPressed: () => context.go('/cart'),
        ),
      ),
    );
}
