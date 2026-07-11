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
import '../utils/product_recommendations.dart';
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
      ref.read(searchCatalogProvider.future);
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
    final catalogAsync = ref.watch(searchCatalogProvider);
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
        final categoryId = normalizeCategoryId(product.category);
        final categoryName = categoriesAsync.valueOrNull
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
          body: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(child: _HeroImage(product: product, discount: discount)),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        product.title,
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, height: 1.2),
                      ),
                      const SizedBox(height: 12),
                      _MetaRow(product: product),
                      const SizedBox(height: 14),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            formatPrice(product.price),
                            style: const TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.w800,
                              color: AppColors.darkGreen,
                            ),
                          ),
                          if (product.originalPrice != null && product.originalPrice! > product.price) ...[
                            const SizedBox(width: 10),
                            Text(
                              formatPrice(product.originalPrice!),
                              style: const TextStyle(
                                fontSize: 15,
                                color: AppColors.textMuted,
                                decoration: TextDecoration.lineThrough,
                              ),
                            ),
                          ],
                        ],
                      ),
                      if (product.unit.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            'Per ${product.unit}',
                            style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                          ),
                        ),
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
                          subtitle: 'More fresh picks in $categoryName',
                          products: related,
                          viewAllLabel: 'See all',
                          onViewAll: () => context.push('/category/$categoryId'),
                          onAdd: addToCart,
                        ),
                      ],
                      if (alsoLike.isNotEmpty) ...[
                        const SizedBox(height: 28),
                        ProductRecommendationRow(
                          title: 'You might also like',
                          subtitle: 'Popular items from other categories',
                          products: alsoLike,
                          viewAllLabel: 'Browse all',
                          onViewAll: () => context.push('/products'),
                          onAdd: addToCart,
                        ),
                      ],
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
            ],
          ),
          floatingActionButton: cartQty > 0
              ? Padding(
                  padding: const EdgeInsets.only(bottom: 72),
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
  const _HeroImage({required this.product, this.discount});

  final Product product;
  final int? discount;

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;

    return Stack(
      children: [
        Container(
          width: double.infinity,
          color: Colors.white,
          padding: EdgeInsets.fromLTRB(20, top + 12, 20, 24),
          child: Stack(
            children: [
              Center(child: ProductThumbnail(image: product.image, size: 280)),
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
          top: top + 8,
          left: 12,
          child: _CircleBtn(
            icon: Icons.arrow_back_ios_new_rounded,
            onTap: () => context.pop(),
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

class _MetaRow extends StatelessWidget {
  const _MetaRow({required this.product});

  final Product product;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        _MetaChip(
          icon: Icons.star_rounded,
          label: product.rating.toStringAsFixed(1),
          color: AppColors.amber,
        ),
        if (product.unit.isNotEmpty)
          _MetaChip(icon: Icons.scale_rounded, label: product.unit, color: AppColors.textMuted),
        if (product.supplierName?.isNotEmpty == true)
          _MetaChip(
            icon: Icons.storefront_outlined,
            label: product.supplierName!,
            color: AppColors.darkGreen,
          ),
        if (product.prime)
          const _MetaChip(icon: Icons.local_shipping_outlined, label: 'Prime', color: AppColors.darkGreen),
      ],
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.icon, required this.label, required this.color});

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.muted,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color),
          ),
        ],
      ),
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
