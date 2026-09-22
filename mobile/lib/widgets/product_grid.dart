import 'package:flutter/material.dart';

import '../models/product.dart';
import '../utils/responsive.dart';
import 'popular_product_card.dart';
import 'product_card.dart';
import 'scroll_slide_in.dart';

/// Fixed-height grid so product cards never overflow.
class ProductGrid extends StatelessWidget {
  const ProductGrid({
    super.key,
    required this.products,
    this.onAdd,
    this.crossAxisCount,
  });

  final List<Product> products;
  final void Function(Product product)? onAdd;
  final int? crossAxisCount;

  static SliverGridDelegateWithFixedCrossAxisCount gridDelegateFor(
    BuildContext context, {
    int? crossAxisCount,
  }) {
    return SliverGridDelegateWithFixedCrossAxisCount(
      crossAxisCount: crossAxisCount ?? productGridCount(context),
      mainAxisExtent: 392,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
    );
  }

  static SliverGridDelegateWithFixedCrossAxisCount popularGridDelegateFor(
    BuildContext context, {
    int? crossAxisCount,
  }) {
    return SliverGridDelegateWithFixedCrossAxisCount(
      crossAxisCount: crossAxisCount ?? productGridCount(context),
      mainAxisExtent: 248,
      crossAxisSpacing: 14,
      mainAxisSpacing: 14,
    );
  }

  /// Phone default — prefer [gridDelegateFor] when a [BuildContext] is available.
  static const gridDelegate = SliverGridDelegateWithFixedCrossAxisCount(
    crossAxisCount: 2,
    mainAxisExtent: 392,
    crossAxisSpacing: 12,
    mainAxisSpacing: 12,
  );

  static const popularGridDelegate = SliverGridDelegateWithFixedCrossAxisCount(
    crossAxisCount: 2,
    mainAxisExtent: 248,
    crossAxisSpacing: 14,
    mainAxisSpacing: 14,
  );

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: gridDelegateFor(context, crossAxisCount: crossAxisCount),
      itemCount: products.length,
      itemBuilder: (context, index) {
        final product = products[index];
        final card = ProductCard(
          product: product,
          onAdd: onAdd == null ? null : () => onAdd!(product),
        );
        if (index >= 8) return card;
        return ScrollSlideIn(index: index, child: card);
      },
    );
  }
}

/// Compact popular-item grid for the home screen.
class PopularProductSliverGrid extends StatelessWidget {
  const PopularProductSliverGrid({
    super.key,
    required this.products,
    this.onAdd,
    this.padding = EdgeInsets.zero,
  });

  final List<Product> products;
  final void Function(Product product)? onAdd;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return SliverPadding(
      padding: padding,
      sliver: SliverGrid(
        gridDelegate: ProductGrid.popularGridDelegateFor(context),
        delegate: SliverChildBuilderDelegate(
          (context, index) {
            final product = products[index];
            final card = PopularProductCard(
              product: product,
              onAdd: onAdd == null ? null : () => onAdd!(product),
            );
            // Animating thousands of cells creates too many tickers and can abort.
            if (index >= 8) return card;
            return ScrollSlideIn(index: index, child: card);
          },
          childCount: products.length,
          addAutomaticKeepAlives: false,
          addRepaintBoundaries: true,
        ),
      ),
    );
  }
}

/// Lazy product grid inside a [CustomScrollView] — preferred for long lists.
class ProductSliverGrid extends StatelessWidget {
  const ProductSliverGrid({
    super.key,
    required this.products,
    this.onAdd,
    this.padding = EdgeInsets.zero,
  });

  final List<Product> products;
  final void Function(Product product)? onAdd;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return SliverPadding(
      padding: padding,
      sliver: SliverGrid(
        gridDelegate: ProductGrid.gridDelegateFor(context),
        delegate: SliverChildBuilderDelegate(
          (context, index) {
            final product = products[index];
            final card = ProductCard(
              product: product,
              onAdd: onAdd == null ? null : () => onAdd!(product),
            );
            if (index >= 8) return card;
            return ScrollSlideIn(index: index, child: card);
          },
          childCount: products.length,
          addAutomaticKeepAlives: false,
          addRepaintBoundaries: true,
        ),
      ),
    );
  }
}

class ProductGridScrollable extends StatelessWidget {
  const ProductGridScrollable({
    super.key,
    required this.products,
    this.onAdd,
    this.padding = const EdgeInsets.all(16),
  });

  final List<Product> products;
  final void Function(Product product)? onAdd;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      padding: padding,
      gridDelegate: ProductGrid.gridDelegateFor(context),
      itemCount: products.length,
      itemBuilder: (context, index) {
        final product = products[index];
        final card = ProductCard(
          product: product,
          onAdd: onAdd == null ? null : () => onAdd!(product),
        );
        if (index >= 8) return card;
        return ScrollSlideIn(index: index, child: card);
      },
    );
  }
}
