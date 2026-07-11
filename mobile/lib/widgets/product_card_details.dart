import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../config/theme.dart';
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

  static String categoryLabel(Product product) {
    return product.category.replaceAll('-', ' ').trim();
  }

  static String? unitLabel(Product product) {
    final unit = product.unit.trim();
    if (unit.isEmpty) return null;
    return 'Per $unit';
  }

  static String? deliveryLine(Product product) {
    if (!product.inStock) return null;
    final custom = product.delivery?.trim();
    if (custom != null && custom.isNotEmpty) return custom;
    if (product.prime) return 'Free Prime delivery';
    return 'Delivery across Uganda';
  }

  static String? stockLabel(Product product) {
    if (!product.inStock) return 'Out of stock';
    final qty = product.stockQuantity;
    if (qty != null && qty > 0 && qty <= 12) return 'Only $qty left';
    return 'In stock';
  }

  static bool isBestSeller(Product product) => product.reviewCount >= 2000;

  static String formatPrice(double price) =>
      NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0).format(price);

  static String socialProof(Product product) {
    if (product.reviewCount >= 500) {
      return '${_compactCount(product.reviewCount)}+ bought';
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
      label: 'Prime',
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
        'Currently unavailable',
        style: TextStyle(
          fontSize: compact ? 10 : 11,
          fontWeight: FontWeight.w600,
          color: AppColors.deal,
        ),
      );
    }

    final line = ProductCardDetails.deliveryLine(product);
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
    final unit = ProductCardDetails.unitLabel(product);

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
              'RRP ${formatPrice(product.originalPrice!)}',
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
