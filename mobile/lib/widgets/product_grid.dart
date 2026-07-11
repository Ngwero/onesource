import 'package:flutter/material.dart';

import '../models/product.dart';
import 'popular_product_card.dart';
import 'product_card.dart';
import 'scroll_slide_in.dart';

/// Fixed-height grid so product cards never overflow.
class ProductGrid extends StatelessWidget {
  const ProductGrid({
    super.key,
    required this.products,
    this.onAdd,
    this.crossAxisCount = 2,
  });

  final List<Product> products;
  final void Function(Product product)? onAdd;
  final int crossAxisCount;

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
      gridDelegate: gridDelegate,
      itemCount: products.length,
      itemBuilder: (context, index) {
        final product = products[index];
        return ScrollSlideIn(
          index: index,
          child: ProductCard(
            product: product,
            onAdd: onAdd == null ? null : () => onAdd!(product),
          ),
        );
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
        gridDelegate: ProductGrid.popularGridDelegate,
        delegate: SliverChildBuilderDelegate(
          (context, index) {
            final product = products[index];
            return ScrollSlideIn(
              index: index,
              child: PopularProductCard(
                product: product,
                onAdd: onAdd == null ? null : () => onAdd!(product),
              ),
            );
          },
          childCount: products.length,
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
        gridDelegate: ProductGrid.gridDelegate,
        delegate: SliverChildBuilderDelegate(
          (context, index) {
            final product = products[index];
            return ScrollSlideIn(
              index: index,
              child: ProductCard(
                product: product,
                onAdd: onAdd == null ? null : () => onAdd!(product),
              ),
            );
          },
          childCount: products.length,
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
      gridDelegate: ProductGrid.gridDelegate,
      itemCount: products.length,
      itemBuilder: (context, index) {
        final product = products[index];
        return ScrollSlideIn(
          index: index,
          child: ProductCard(
            product: product,
            onAdd: onAdd == null ? null : () => onAdd!(product),
          ),
        );
      },
    );
  }
}
