import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../data/cosmetics.dart';
import '../i18n/app_strings.dart';
import '../models/product.dart';
import '../providers/currency_provider.dart';
import '../utils/cart_feedback.dart';
import '../utils/categories.dart';
import 'product_card_details.dart';
import 'product_checkout_actions.dart';
import 'product_thumbnail.dart';
import 'rating_stars.dart';

/// Compact product tile for home "Popular items" grid.
class PopularProductCard extends ConsumerWidget {
  const PopularProductCard({
    super.key,
    required this.product,
    this.onAdd,
    this.addBelow = false,
    this.imageSize = 108,
  });

  final Product product;
  final VoidCallback? onAdd;

  /// Puts the basket control under the photo, title, and price.
  final bool addBelow;

  /// Photo frame in logical pixels. Pharmacy passes a larger frame.
  final double imageSize;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unit = ProductCardDetails.unitLabel(product, context.tr);
    final formatPrice = ref.watch(formatPriceProvider);
    final cosmetics = addBelow && isCosmeticsProduct(product);
    final exportProduct =
        productMatchesCategory(product.category, 'export-fresh-produce');
    final showPair = onAdd != null && !exportProduct;
    final useColumn = addBelow || onAdd != null;
    final brand = product.details.brand?.trim();
    final title = context.tr.productTitle(product);
    final displayTitle = cosmetics ? _titleWithoutBrand(title, brand) : title;
    final variant = cosmetics ? _cosmeticVariant(product, title) : null;
    final onSale =
        product.originalPrice != null && product.originalPrice! > product.price;
    final fact = !cosmetics
        ? null
        : !product.inStock
            ? context.tr.get('common.outOfStock')
            : (variant ?? context.tr.get('product.inStock'));

    final details = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Center(
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: ProductThumbnail(image: product.image, size: imageSize),
            ),
          ),
        ),
        const SizedBox(height: 8),
        if (cosmetics && brand != null && brand.isNotEmpty)
          Text(
            brand,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
                fontSize: 11, height: 1.2, color: AppColors.textMuted),
          ),
        Text(
          displayTitle,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontWeight: cosmetics ? FontWeight.w500 : FontWeight.w700,
            fontSize: 13,
            height: 1.25,
            color: AppColors.text,
          ),
        ),
        const SizedBox(height: 4),
        CardRating(product: product, size: 11),
        const SizedBox(height: 4),
        if (cosmetics)
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                formatPrice(product.price),
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                  color: AppColors.text,
                ),
              ),
              if (onSale) ...[
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    formatPrice(product.originalPrice!),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textMuted,
                      decoration: TextDecoration.lineThrough,
                    ),
                  ),
                ),
              ],
            ],
          )
        else
          Text(
            formatPrice(product.price),
            style: const TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 15,
              color: AppColors.darkGreen,
            ),
          ),
        if (cosmetics && fact != null)
          Text(
            fact,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 11,
              height: 1.3,
              color: !product.inStock
                  ? const Color(0xFFB12704)
                  : variant == null
                      ? const Color(0xFF067D62)
                      : AppColors.textMuted,
            ),
          )
        else if (!cosmetics && unit != null)
          Text(
            unit,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
          ),
      ],
    );

    final belowButton = onAdd != null
        ? Padding(
            padding: const EdgeInsets.fromLTRB(14, 8, 14, 14),
            child: showPair
                ? ProductCheckoutActions(
                    inStock: product.inStock,
                    onAdd: onAdd!,
                    onPayNow: () => payNowAndCheckout(context, ref, product),
                  )
                : FilledButton(
                    onPressed: product.inStock ? onAdd : null,
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFFFFDF00),
                      foregroundColor: const Color(0xFF0F1111),
                      minimumSize: const Size(0, 44),
                    ),
                    child: Text(context.tr.get(product.inStock
                        ? 'common.addToBasket'
                        : 'common.outOfStock')),
                  ),
          )
        : null;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: softCardShadow,
      ),
      clipBehavior: Clip.antiAlias,
      child: useColumn
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () => context.push('/product/${product.id}'),
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(14, 14, 14, 0),
                        child: details,
                      ),
                    ),
                  ),
                ),
                if (belowButton != null) belowButton,
              ],
            )
          : Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () => context.push('/product/${product.id}'),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 14, 14, 16),
                  child: details,
                ),
              ),
            ),
    );
  }
}

final _measure = RegExp(
    r'\d+(?:[.,]\d+)?\s?(?:ml|cl|fl\.?\s?oz|oz|kg|g|l|mm|cm)\b',
    caseSensitive: false);
final _variantNote = RegExp(r'\(([^)]{2,48})\)\s*$');
final _variantWords = RegExp(
    r'shade|colour|color|scent|fragrance|size|pack|pair',
    caseSensitive: false);

String? _measureLabel(String? value) {
  final text = value?.replaceAll(RegExp(r'\s+'), ' ').trim() ?? '';
  if (text.isEmpty || text.toLowerCase() == 'each') return null;
  final match = _measure.firstMatch(text);
  return match?.group(0)?.replaceAll(RegExp(r'\s+'), ' ').trim();
}

String _titleWithoutBrand(String title, String? brand) {
  final name = brand?.trim();
  if (name == null || name.isEmpty) return title;
  final pattern = RegExp('^${RegExp.escape(name)}(?:\\s*[:–—-])?\\s+',
      caseSensitive: false);
  final stripped = title.replaceFirst(pattern, '').trim();
  return stripped.isEmpty ? title : stripped;
}

String? _cosmeticVariant(Product product, String title) {
  String? fromSpecs;
  for (final spec in product.details.specs) {
    final key = spec.key.toLowerCase();
    final label = spec.label.toLowerCase();
    if (key == 'size' ||
        key == 'volume' ||
        key == 'weight' ||
        label == 'size' ||
        label == 'volume') {
      fromSpecs = spec.value;
      break;
    }
  }
  final measured = _measureLabel(fromSpecs) ??
      _measureLabel(product.unit) ??
      _measureLabel(title);
  if (measured != null) return measured;
  final note = _variantNote.firstMatch(title)?.group(1)?.trim();
  if (note != null && _variantWords.hasMatch(note)) return note;
  return null;
}
