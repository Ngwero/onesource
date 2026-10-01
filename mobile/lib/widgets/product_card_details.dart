import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../models/product.dart';
import '../providers/currency_provider.dart';

/// Shared copy and formatting for product cards.
class ProductCardDetails {
  const ProductCardDetails._();

  static int? discountPercent(Product product) {
    final was = product.originalPrice;
    if (was == null || was <= product.price) return null;
    return (((was - product.price) / was) * 100).round();
  }

  static String categoryLabel(Product product, AppStrings s) {
    final id = product.category.trim();
    if (id.isEmpty) return '';
    return s.categoryName(id);
  }

  static String? unitLabel(Product product, AppStrings s) {
    final unit = product.unit.trim();
    if (unit.isEmpty) return null;
    final lower = unit.toLowerCase();
    final label = lower.startsWith('per ') || lower == 'each'
        ? s.unit(unit)
        : s.t('app.product.perUnit', {'unit': s.unit(unit)});
    return label.isEmpty ? label : label[0].toUpperCase() + label.substring(1);
  }

  static String? deliveryLine(Product product, AppStrings s) {
    if (!product.inStock) return null;
    final custom = product.delivery?.trim();
    if (custom != null && custom.isNotEmpty) return s.productDelivery(product);
    if (product.prime) return s.get('app.product.freePrimeDelivery');
    return s.get('app.product.deliveryUganda');
  }

  /// Null when simply in stock.
  static String? stockLabel(Product product, AppStrings s) {
    if (!product.inStock) return s.get('common.outOfStock');
    final qty = product.stockQuantity;
    if (qty != null && qty > 0 && qty <= 12) return s.t('app.product.onlyLeft', {'count': qty});
    return null;
  }

  static bool isBestSeller(Product product) => product.reviewCount >= 2000;

  static String formatPrice(double price) =>
      NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0).format(price);

  static String socialProof(Product product, AppStrings s) {
    if (product.reviewCount >= 500) {
      return s.t('app.product.bought', {'count': _compactCount(product.reviewCount)});
    }
    return '';
  }

  static String _compactCount(int n) {
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}k';
    return '$n';
  }
}

class ProductBadge extends StatelessWidget {
  const ProductBadge({
    super.key,
    required this.label,
    this.background = AppColors.leafPale,
    this.foreground = AppColors.darkGreen,
    this.compact = false,
  });

  final String label;
  final Color background;
  final Color foreground;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: compact ? 6 : 8, vertical: compact ? 3 : 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(compact ? 6 : 8),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: foreground,
          fontSize: compact ? 9 : 10,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.2,
        ),
      ),
    );
  }
}

class PrimeBadge extends StatelessWidget {
  const PrimeBadge({super.key, this.compact = false});

  final bool compact;

  @override
  Widget build(BuildContext context) {
    return ProductBadge(
      label: context.tr.or('common.prime', 'Prime'),
      background: AppColors.darkGreen,
      foreground: Colors.white,
      compact: compact,
    );
  }
}

class ProductDeliveryRow extends StatelessWidget {
  const ProductDeliveryRow({super.key, required this.product, this.compact = false});

  final Product product;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    if (!product.inStock) {
      return Text(
        context.tr.get('app.product.unavailable'),
        style: TextStyle(
          fontSize: compact ? 10 : 11,
          fontWeight: FontWeight.w600,
          color: AppColors.deal,
        ),
      );
    }

    final line = ProductCardDetails.deliveryLine(product, context.tr);
    if (line == null) return const SizedBox.shrink();

    return Row(
      children: [
        Icon(
          product.prime ? Icons.local_shipping_outlined : Icons.schedule_outlined,
          size: compact ? 12 : 13,
          color: product.prime ? AppColors.darkGreen : AppColors.textMuted,
        ),
        const SizedBox(width: 4),
        Expanded(
          child: Text(
            line,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: compact ? 10 : 11,
              color: product.prime ? AppColors.darkGreen : AppColors.textMuted,
              fontWeight: product.prime ? FontWeight.w600 : FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }
}

class ProductPriceBlock extends ConsumerWidget {
  const ProductPriceBlock({
    super.key,
    required this.product,
    this.compact = false,
  });

  final Product product;
  final bool compact;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final formatPrice = ref.watch(formatPriceProvider);
    final discount = ProductCardDetails.discountPercent(product);
    final unit = ProductCardDetails.unitLabel(product, context.tr);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            if (discount != null) ...[
              Container(
                margin: const EdgeInsets.only(right: 6),
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.amber.withValues(alpha: 0.25),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '-$discount%',
                  style: TextStyle(
                    fontSize: compact ? 10 : 11,
                    fontWeight: FontWeight.w800,
                    color: AppColors.deal,
                  ),
                ),
              ),
            ],
            Text(
              formatPrice(product.price),
              style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: compact ? 14 : 16,
                color: AppColors.darkGreen,
              ),
            ),
          ],
        ),
        if (product.originalPrice != null && product.originalPrice! > product.price)
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text(
              '${context.tr.get('productCard.rrp')} ${formatPrice(product.originalPrice!)}',
              style: TextStyle(
                fontSize: compact ? 10 : 11,
                color: AppColors.textMuted,
                decoration: TextDecoration.lineThrough,
              ),
            ),
          ),
        if (unit != null)
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text(
              unit,
              style: TextStyle(fontSize: compact ? 10 : 11, color: AppColors.textMuted),
            ),
          ),
      ],
    );
  }
}
