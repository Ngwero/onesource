import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../models/product.dart';
import '../providers/cart_provider.dart';
import '../providers/currency_provider.dart';
import '../providers/products_provider.dart';
import '../providers/search_catalog_provider.dart';
import '../utils/categories.dart';
import '../utils/kitchen_mode.dart';
import '../utils/product_recommendations.dart';
import '../utils/responsive.dart';
import '../data/kitchen_ware.dart';
import '../widgets/loading_view.dart';
import '../widgets/product_card_details.dart';
import '../widgets/product_recommendation_row.dart';
import '../widgets/product_thumbnail.dart';
import '../widgets/quantity_stepper.dart';
import '../widgets/rating_stars.dart';

class ProductDetailScreen extends ConsumerStatefulWidget {
  const ProductDetailScreen({super.key, required this.productId});

  final String productId;

  @override
  ConsumerState<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends ConsumerState<ProductDetailScreen> with SingleTickerProviderStateMixin {
  int _qty = 1;
  late final TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    _tabs.addListener(() => setState(() {}));
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final shop = widget.productId.startsWith('kitchen-') ? 'kitchen' : 'fresh';
      ref.read(searchCatalogProvider(shop).future);
    });
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final productAsync = ref.watch(productProvider(widget.productId));
    final kitchenSku = widget.productId.startsWith('kitchen-');
    final catalogAsync = ref.watch(searchCatalogProvider(kitchenSku ? 'kitchen' : 'fresh'));
    final categoriesAsync = ref.watch(categoriesProvider);
    final cartQty = ref
        .watch(cartProvider)
        .where((i) => i.product.id == widget.productId)
        .fold(0, (s, i) => s + i.quantity);

    return productAsync.when(
      loading: () => const Scaffold(backgroundColor: AppColors.canvas, body: LoadingView()),
      error: (e, _) => Scaffold(appBar: AppBar(), body: Center(child: Text(e.toString()))),
      data: (product) {
        if (product == null) {
          return Scaffold(appBar: AppBar(), body: const Center(child: Text('Product not found')));
        }

        final catalog = catalogAsync.valueOrNull ?? [];
        final related = pickRelatedProducts(product, catalog);
        final alsoLike = pickYouMightAlsoLike(
          product,
          catalog,
          excludeIds: related.map((p) => p.id),
        );
        final kitchen = isKitchenProduct(product);
        final aisleId = aisleIdFromProductId(product.id);
        final categoryId = normalizeCategoryId(product.category);
        final categoryName = kitchen
            ? (kitchenAisleById(aisleId)?.title ?? 'Kitchen Ware')
            : categoriesAsync.valueOrNull
                    ?.where((c) => c.id == categoryId)
                    .map((c) => c.name)
                    .firstOrNull ??
                categoryDisplayName(product.category);
        final discount = ProductCardDetails.discountPercent(product);
        final maxQty = product.stockQuantity ?? 99;
        final formatPrice = ref.watch(formatPriceProvider);

        void addToCart(Product p, {int quantity = 1}) {
          ref.read(cartProvider.notifier).add(p, quantity: quantity);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('${p.title} added'),
              behavior: SnackBarBehavior.floating,
              backgroundColor: AppColors.darkGreen,
            ),
          );
        }

        return Scaffold(
          backgroundColor: AppColors.canvas,
          bottomNavigationBar: _StickyBuyBar(
            product: product,
            quantity: _qty,
            maxQty: maxQty,
            formatPrice: formatPrice,
            onQuantityChanged: (q) => setState(() => _qty = q),
            onAdd: () {
              ref.read(cartProvider.notifier).add(product, quantity: _qty);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('$_qty × ${product.title} added'),
                  behavior: SnackBarBehavior.floating,
                  backgroundColor: AppColors.darkGreen,
                ),
              );
            },
          ),
          body: LayoutBuilder(
            builder: (context, constraints) {
              final wide = constraints.maxWidth >= AppBreakpoints.wide;
              final details = Padding(
                padding: EdgeInsets.fromLTRB(wide ? 8 : 20, wide ? 28 : 20, 20, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.title,
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, height: 1.2),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                formatPrice(product.price),
                                style: const TextStyle(
                                  fontSize: 28,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.darkGreen,
                                ),
                              ),
                              if (product.unit.isNotEmpty)
                                Padding(
                                  padding: const EdgeInsets.only(top: 2),
                                  child: Text(
                                    '${formatPrice(product.price)} / ${product.unit}',
                                    style: const TextStyle(
                                      color: AppColors.textMuted,
                                      fontSize: 13,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                        if (product.originalPrice != null &&
                            product.originalPrice! > product.price)
                          Text(
                            formatPrice(product.originalPrice!),
                            style: const TextStyle(
                              fontSize: 15,
                              color: AppColors.textMuted,
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    _ProductFacts(
                      categoryName: categoryName,
                      product: product,
                    ),
                    const SizedBox(height: 18),
                    _HighlightStats(product: product),
                    const SizedBox(height: 20),
                    _TabSelector(controller: _tabs),
                    const SizedBox(height: 16),
                    _TabContent(product: product, tabIndex: _tabs.index),
                    if (catalogAsync.isLoading && related.isEmpty && alsoLike.isEmpty)
                      const Padding(
                        padding: EdgeInsets.only(top: 28),
                        child: Center(
                          child: SizedBox(
                            width: 28,
                            height: 28,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              color: AppColors.darkGreen,
                            ),
                          ),
                        ),
                      ),
                    if (related.isNotEmpty) ...[
                      const SizedBox(height: 28),
                      ProductRecommendationRow(
                        title: 'Related products',
                        subtitle: kitchen
                            ? 'More from $categoryName'
                            : 'More fresh picks in $categoryName',
                        products: related,
                        viewAllLabel: 'See all',
                        onViewAll: () => context.push(
                          kitchen && aisleId != null
                              ? kitchenAislePath(aisleId)
                              : kitchen
                                  ? '/kitchen/shop'
                                  : '/category/$categoryId',
                        ),
                        onAdd: addToCart,
                      ),
                    ],
                    if (alsoLike.isNotEmpty) ...[
                      const SizedBox(height: 28),
                      ProductRecommendationRow(
                        title: 'You might also like',
                        subtitle: kitchen
                            ? 'Popular picks from other kitchen aisles'
                            : 'Popular items from other categories',
                        products: alsoLike,
                        viewAllLabel: 'Browse all',
                        onViewAll: () => context.go(kitchen ? '/kitchen/shop' : '/shop'),
                        onAdd: addToCart,
                      ),
                    ],
                    const SizedBox(height: 24),
                  ],
                ),
              );

              if (wide) {
                return ContentWidth(
                  maxWidth: 1200,
                  child: CustomScrollView(
                    slivers: [
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                flex: 5,
                                child: _HeroImage(
                                  product: product,
                                  discount: discount,
                                  compact: true,
                                ),
                              ),
                              Expanded(
                                flex: 6,
                                child: details,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }

              return CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(child: _HeroImage(product: product, discount: discount)),
                  SliverToBoxAdapter(child: details),
                ],
              );
            },
          ),
          floatingActionButton: cartQty > 0
              ? Padding(
                  padding: EdgeInsets.only(bottom: isWideLayout(context) ? 16 : 72),
                  child: FloatingActionButton.small(
                    onPressed: () => context.go('/cart'),
                    backgroundColor: AppColors.darkGreen,
                    child: Badge(
                      label: Text('$cartQty'),
                      child: const Icon(Icons.shopping_bag_outlined, color: Colors.white),
                    ),
                  ),
                )
              : null,
        );
      },
    );
  }
}

class _HeroImage extends StatelessWidget {
  const _HeroImage({
    required this.product,
    this.discount,
    this.compact = false,
  });

  final Product product;
  final int? discount;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    final imageSize = compact ? 320.0 : 280.0;

    return Stack(
      children: [
        Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: compact ? BorderRadius.circular(24) : null,
          ),
          padding: EdgeInsets.fromLTRB(20, compact ? 48 : top + 12, 20, 24),
          child: Stack(
            children: [
              Center(child: ProductThumbnail(image: product.image, size: imageSize)),
              if (discount != null)
                Positioned(
                  top: 0,
                  left: 0,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.deal,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '-$discount%',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13),
                    ),
                  ),
                ),
            ],
          ),
        ),
        Positioned(
          top: compact ? 12 : top + 8,
          left: 12,
          child: _CircleBtn(
            icon: Icons.arrow_back_ios_new_rounded,
            onTap: () => context.pop(),
          ),
        ),
        Positioned(
          top: compact ? 12 : top + 8,
          right: 12,
          child: _CircleBtn(
            icon: Icons.favorite_border_rounded,
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Saved for later'),
                  behavior: SnackBarBehavior.floating,
                  backgroundColor: AppColors.darkGreen,
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _CircleBtn extends StatelessWidget {
  const _CircleBtn({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      elevation: 2,
      shadowColor: Colors.black26,
      shape: const CircleBorder(),
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: SizedBox(
          width: 40,
          height: 40,
          child: Icon(icon, size: 18, color: AppColors.text),
        ),
      ),
    );
  }
}

class _ProductFacts extends StatelessWidget {
  const _ProductFacts({required this.categoryName, required this.product});

  final String categoryName;
  final Product product;

  @override
  Widget build(BuildContext context) {
    final rows = <({IconData icon, String label, String value})>[
      (icon: Icons.grid_view_rounded, label: 'Category', value: categoryName),
      if (product.supplierName?.isNotEmpty == true)
        (
          icon: Icons.public_rounded,
          label: 'Origin / seller',
          value: product.supplierName!,
        ),
      if (product.unit.isNotEmpty)
        (icon: Icons.scale_rounded, label: 'Unit', value: product.unit),
      (
        icon: Icons.inventory_2_outlined,
        label: 'Availability',
        value: product.inStock
            ? (product.stockQuantity != null
                ? '${product.stockQuantity} in stock'
                : 'In stock')
            : 'Out of stock',
      ),
      if (product.delivery?.isNotEmpty == true)
        (
          icon: Icons.local_shipping_outlined,
          label: 'Delivery',
          value: product.delivery!,
        ),
      if (product.prime)
        (
          icon: Icons.bolt_rounded,
          label: 'Prime',
          value: 'Faster fulfilment',
        ),
    ];

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: softCardShadow,
      ),
      child: Column(
        children: [
          for (var i = 0; i < rows.length; i++) ...[
            if (i > 0) const Divider(height: 18, color: AppColors.border),
            Row(
              children: [
                Icon(rows[i].icon, size: 18, color: AppColors.darkGreen),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    rows[i].label,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textMuted,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Flexible(
                  child: Text(
                    rows[i].value,
                    textAlign: TextAlign.right,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.text,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _HighlightStats extends StatelessWidget {
  const _HighlightStats({required this.product});

  final Product product;

  @override
  Widget build(BuildContext context) {
    final items = <({String value, String label})>[
      (value: product.rating.toStringAsFixed(1), label: 'Rating'),
      (value: '${product.reviewCount}', label: 'Reviews'),
      (
        value: product.stockQuantity != null ? '${product.stockQuantity}' : '—',
        label: 'Stock',
      ),
      (value: product.prime ? 'Yes' : 'Std', label: 'Prime'),
    ];

    return Row(
      children: [
        for (final item in items)
          Expanded(
            child: Column(
              children: [
                Container(
                  width: 64,
                  height: 64,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.leafPale,
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Text(
                    item.value,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                      color: AppColors.darkGreen,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  item.label,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _TabSelector extends StatelessWidget {
  const _TabSelector({required this.controller});

  final TabController controller;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(5),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: softCardShadow,
      ),
      child: TabBar(
        controller: controller,
        labelColor: Colors.white,
        unselectedLabelColor: AppColors.textMuted,
        indicator: BoxDecoration(
          color: AppColors.darkGreen,
          borderRadius: BorderRadius.circular(12),
        ),
        indicatorSize: TabBarIndicatorSize.tab,
        dividerColor: Colors.transparent,
        labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
        tabs: const [
          Tab(text: 'Details'),
          Tab(text: 'Support'),
          Tab(text: 'Ratings'),
        ],
      ),
    );
  }
}

class _TabContent extends StatelessWidget {
  const _TabContent({required this.product, required this.tabIndex});

  final Product product;
  final int tabIndex;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: softCardShadow,
      ),
      child: switch (tabIndex) {
        1 => Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Need help?', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
              const SizedBox(height: 8),
              Text(
                product.delivery?.trim().isNotEmpty == true
                    ? product.delivery!.trim()
                    : 'Contact One Source support for delivery questions, refunds, or product issues.',
                style: const TextStyle(height: 1.55, color: AppColors.textMuted, fontSize: 14),
              ),
              const SizedBox(height: 14),
              OutlinedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.support_agent_outlined, size: 18),
                label: const Text('Chat with support'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.darkGreen,
                  side: const BorderSide(color: AppColors.darkGreen),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ],
          ),
        2 => Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              RatingStars(rating: product.rating, reviewCount: product.reviewCount),
              const SizedBox(height: 12),
              Text(
                product.reviewCount > 0
                    ? '${product.reviewCount} customers rated this product.'
                    : 'No reviews yet — be the first to rate this item.',
                style: const TextStyle(color: AppColors.textMuted, height: 1.5, fontSize: 14),
              ),
            ],
          ),
        _ => Text(
            product.description.isNotEmpty
                ? product.description
                : 'Fresh quality produce from One Source — carefully selected and delivered across Uganda.',
            style: const TextStyle(height: 1.55, color: AppColors.textMuted, fontSize: 14),
          ),
      },
    );
  }
}

class _StickyBuyBar extends StatelessWidget {
  const _StickyBuyBar({
    required this.product,
    required this.quantity,
    required this.maxQty,
    required this.formatPrice,
    required this.onQuantityChanged,
    required this.onAdd,
  });

  final Product product;
  final int quantity;
  final int maxQty;
  final String Function(double) formatPrice;
  final ValueChanged<int> onQuantityChanged;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: softCardShadow,
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            QuantityStepper(
              quantity: quantity,
              min: 1,
              max: maxQty,
              compact: true,
              onChanged: onQuantityChanged,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: FilledButton(
                onPressed: product.inStock ? onAdd : null,
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(52),
                  backgroundColor: AppColors.darkGreen,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: Text(
                  product.inStock
                      ? 'Add to cart · ${formatPrice(product.price * quantity)}'
                      : 'Out of stock',
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
