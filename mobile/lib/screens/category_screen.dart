import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../utils/cart_feedback.dart';
import '../models/product.dart';
import '../providers/currency_provider.dart';
import '../providers/paginated_products_provider.dart';
import '../providers/products_provider.dart';
import '../widgets/horizontal_product_card.dart';
import '../widgets/loading_view.dart';
import '../widgets/product_card.dart';
import '../widgets/product_card_details.dart';
import '../widgets/product_grid.dart';
import '../widgets/product_thumbnail.dart';
import '../widgets/products_load_more.dart';
import '../widgets/rating_stars.dart';
import '../widgets/scroll_slide_in.dart';

enum _CategoryFilter { all, deals, prime, inStock }

enum _CategorySort { featured, priceLow, priceHigh, name, rating }

class CategoryScreen extends ConsumerStatefulWidget {
  const CategoryScreen({super.key, required this.categoryId});

  final String categoryId;

  @override
  ConsumerState<CategoryScreen> createState() => _CategoryScreenState();
}

class _CategoryScreenState extends ConsumerState<CategoryScreen> {
  bool _gridView = true;
  _CategoryFilter _filter = _CategoryFilter.all;
  _CategorySort _sort = _CategorySort.featured;
  final _scrollController = ScrollController();
  InfiniteScrollListener? _scrollListener;
  bool _contentShown = false;

  /// Deals/Prime and sort run server-side so every page is already filtered.
  ProductsQuery get _query => ProductsQuery(
        categoryId: widget.categoryId,
        sale: _filter == _CategoryFilter.deals,
        prime: _filter == _CategoryFilter.prime,
        sort: switch (_sort) {
          _CategorySort.featured || _CategorySort.rating => 'top',
          _CategorySort.priceLow => 'price-asc',
          _CategorySort.priceHigh => 'price-desc',
          _CategorySort.name => 'name',
        },
      );

  @override
  void initState() {
    super.initState();
    _scrollListener = InfiniteScrollListener(
      controller: _scrollController,
      onLoadMore: _loadMore,
    );
  }

  @override
  void dispose() {
    _scrollListener?.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _loadMore() {
    ref.read(paginatedProductsProvider(_query).notifier).loadMore();
  }

  List<Product> _applyFilter(List<Product> products) {
    return switch (_filter) {
      _CategoryFilter.inStock => products.where((p) => p.inStock).toList(),
      _ => products,
    };
  }

  void _addToCart(Product product) => addToCartWithFeedback(context, ref, product);

  Product? _spotlightProduct(List<Product> products) {
    if (products.isEmpty) return null;
    final deals = products.where((p) => ProductCardDetails.discountPercent(p) != null).toList();
    if (deals.isNotEmpty) {
      deals.sort((a, b) => (b.reviewCount).compareTo(a.reviewCount));
      return deals.first;
    }
    final sorted = [...products]..sort((a, b) => b.rating.compareTo(a.rating));
    return sorted.first;
  }

  @override
  Widget build(BuildContext context) {
    final query = _query;
    final productsState = ref.watch(paginatedProductsProvider(query));
    final categoriesAsync = ref.watch(categoriesProvider);
    final category = categoriesAsync.value?.where((c) => c.id == widget.categoryId).firstOrNull;
    final categoryName = context.tr.categoryName(widget.categoryId, category?.name);
    final categoryIcon = category?.icon ?? '🥬';
    final notifier = ref.read(paginatedProductsProvider(query).notifier);
    final allProducts = productsState.items;
    final filtered = _applyFilter(allProducts);
    final spotlight = _spotlightProduct(allProducts);

    if (productsState.isInitialLoading && !_contentShown) {
      return Scaffold(
        backgroundColor: AppColors.canvas,
        body: LoadingView(message: context.tr.get('common.loading')),
      );
    }

    if (productsState.error != null && allProducts.isEmpty && !_contentShown) {
      return Scaffold(
        backgroundColor: AppColors.canvas,
        appBar: AppBar(title: Text(categoryName)),
        body: ErrorView(
          message: productsState.error!,
          onRetry: notifier.refresh,
        ),
      );
    }

    _contentShown = true;
    final feedPending = productsState.isInitialLoading ||
        (productsState.hasMore && productsState.error == null);
    _scrollListener?.scheduleCheck();

    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: RefreshIndicator(
        color: AppColors.leaf,
        onRefresh: () async {
          await notifier.refresh();
          ref.invalidate(categoriesProvider);
        },
        child: CustomScrollView(
          controller: _scrollController,
          slivers: [
            SliverAppBar(
              pinned: true,
              stretch: true,
              expandedHeight: 168,
              backgroundColor: AppColors.leafDark,
              foregroundColor: Colors.white,
              leading: IconButton(
                icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
                onPressed: () => context.pop(),
              ),
              actions: [
                IconButton(
                  icon: const Icon(Icons.search_rounded),
                  onPressed: () => context.push('/search'),
                ),
              ],
              flexibleSpace: FlexibleSpaceBar(
                stretchModes: const [StretchMode.zoomBackground, StretchMode.blurBackground],
                background: DecoratedBox(
                  decoration: const BoxDecoration(gradient: AppGradients.brandVibrant),
                  child: SafeArea(
                    bottom: false,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 52, 20, 16),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Container(
                            width: 64,
                            height: 64,
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.18),
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white.withValues(alpha: 0.35)),
                            ),
                            alignment: Alignment.center,
                            child: Text(categoryIcon, style: const TextStyle(fontSize: 32)),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.end,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  categoryName,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 24,
                                    fontWeight: FontWeight.w800,
                                    height: 1.15,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  context.tr.get('app.product.deliveryUganda'),
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.88),
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ScrollSlideIn(
                      index: 0,
                      child: Text(
                        context.tr.t('app.categories.intro', {'category': categoryName}),
                        style: const TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 14,
                          height: 1.45,
                        ),
                      ),
                    ),
                    if (spotlight != null) ...[
                      const SizedBox(height: 20),
                      ScrollSlideIn(
                        index: 1,
                        child: _SpotlightCard(
                          product: spotlight,
                          onTap: () => context.push('/product/${spotlight.id}'),
                          onAdd: () => _addToCart(spotlight),
                        ),
                      ),
                    ],
                    const SizedBox(height: 20),
                    ScrollSlideIn(
                      index: 2,
                      child: categoriesAsync.when(
                      loading: () => const SizedBox.shrink(),
                      error: (_, __) => const SizedBox.shrink(),
                      data: (categories) {
                        final related = categories
                            .where((c) =>
                                c.id != widget.categoryId &&
                                c.id != 'kitchen-ware' &&
                                c.id != 'kitchen-furniture' &&
                                c.id != 'cosmetics' &&
                                c.id != 'pharmacy')
                            .take(8)
                            .toList();
                        if (related.isEmpty) return const SizedBox.shrink();
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              context.tr.get('common.browseAll'),
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 10),
                            SizedBox(
                              height: 40,
                              child: ListView(
                                scrollDirection: Axis.horizontal,
                                children: [
                                  for (final cat in related)
                                    Padding(
                                      padding: const EdgeInsets.only(right: 8),
                                      child: ActionChip(
                                        avatar: Text(cat.icon, style: const TextStyle(fontSize: 14)),
                                        label: Text(context.tr.categoryName(cat.id, cat.name)),
                                        onPressed: () => context.pushReplacement('/category/${cat.id}'),
                                        backgroundColor: Colors.white,
                                        side: const BorderSide(color: AppColors.border),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 20),
                          ],
                        );
                      },
                    ),
                    ),
                    ScrollSlideIn(
                      index: 3,
                      child: _Toolbar(
                        gridView: _gridView,
                        sort: _sort,
                        onToggleLayout: () => setState(() => _gridView = !_gridView),
                        onSort: (v) => setState(() => _sort = v),
                      ),
                    ),
                    const SizedBox(height: 12),
                    ScrollSlideIn(
                      index: 4,
                      child: SizedBox(
                        height: 38,
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          children: [
                            _FilterChip(context.tr.get('app.filter.all'), _filter == _CategoryFilter.all, () => setState(() => _filter = _CategoryFilter.all)),
                            _FilterChip(context.tr.get('app.filter.deals'), _filter == _CategoryFilter.deals, () => setState(() => _filter = _CategoryFilter.deals)),
                            _FilterChip(context.tr.get('app.filter.prime'), _filter == _CategoryFilter.prime, () => setState(() => _filter = _CategoryFilter.prime)),
                            _FilterChip(context.tr.get('app.filter.inStock'), _filter == _CategoryFilter.inStock, () => setState(() => _filter = _CategoryFilter.inStock)),
                            _FilterChip(context.tr.get('app.sort.rating'), _sort == _CategorySort.rating, () => setState(() => _sort = _CategorySort.rating)),
                          ],
                        ),
                      ),
                    ),
                    if (filtered.isEmpty && !feedPending) ...[
                      const SizedBox(height: 10),
                      Text(
                        context.tr.get('kitchen.noFilterResults'),
                        style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                      ),
                    ],
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            ),
            if (productsState.isInitialLoading)
              SliverFillRemaining(
                hasScrollBody: false,
                child: LoadingView(message: context.tr.get('common.loading')),
              )
            else if (productsState.error != null && allProducts.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: ErrorView(message: productsState.error!, onRetry: notifier.refresh),
              )
            else if (filtered.isEmpty && !feedPending)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Center(child: Text(context.tr.get('kitchen.noFilterResults'))),
              )
            else if (_gridView)
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
                sliver: SliverGrid(
                  gridDelegate: ProductGrid.gridDelegateFor(context),
                  delegate: SliverChildBuilderDelegate(
                    (context, index) => ScrollSlideIn(
                      index: index,
                      child: ProductCard(
                        product: filtered[index],
                        showImageZoom: true,
                        onAdd: () => _addToCart(filtered[index]),
                      ),
                    ),
                    childCount: filtered.length,
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 0),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final product = filtered[index];
                      return ScrollSlideIn(
                        index: index,
                        axis: Axis.horizontal,
                        child: HorizontalProductCard(
                          product: product,
                          showImageZoom: true,
                          onBuy: () => _addToCart(product),
                        ),
                      );
                    },
                    childCount: filtered.length,
                  ),
                ),
              ),
            if (!productsState.isInitialLoading)
              ProductsLoadMoreSliver(
                isLoadingMore: productsState.isLoadingMore,
                hasMore: productsState.hasMore,
                itemCount: filtered.length,
                total: productsState.total,
                error: productsState.hasLoadMoreError ? productsState.error : null,
                onRetry: notifier.retry,
              ),
          ],
        ),
      ),
    );
  }
}

class _SpotlightCard extends ConsumerWidget {
  const _SpotlightCard({
    required this.product,
    required this.onTap,
    required this.onAdd,
  });

  final Product product;
  final VoidCallback onTap;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final formatPrice = ref.watch(formatPriceProvider);
    final discount = ProductCardDetails.discountPercent(product);

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.border.withValues(alpha: 0.8)),
            boxShadow: softCardShadow,
          ),
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              ProductThumbnail(image: product.image, size: 88),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        ProductBadge(label: context.tr.get('app.product.topPick'), compact: true),
                        if (discount != null) ...[
                          const SizedBox(width: 6),
                          ProductBadge(
                            label: '-$discount%',
                            background: AppColors.deal,
                            foreground: Colors.white,
                            compact: true,
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      context.tr.productTitle(product),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, height: 1.25),
                    ),
                    const SizedBox(height: 6),
                    CardRating(product: product),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Text(
                          formatPrice(product.price),
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                        ),
                        const Spacer(),
                        FilledButton(
                          onPressed: product.inStock ? onAdd : null,
                          style: FilledButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 14),
                            minimumSize: const Size(0, 36),
                            textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                          ),
                          child: Text(context.tr.get('common.add')),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Toolbar extends StatelessWidget {
  const _Toolbar({
    required this.gridView,
    required this.sort,
    required this.onToggleLayout,
    required this.onSort,
  });

  final bool gridView;
  final _CategorySort sort;
  final VoidCallback onToggleLayout;
  final ValueChanged<_CategorySort> onSort;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(context.tr.get('common.products'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        const Spacer(),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _LayoutToggle(
                icon: Icons.grid_view_rounded,
                selected: gridView,
                onTap: gridView ? null : onToggleLayout,
              ),
              _LayoutToggle(
                icon: Icons.view_list_rounded,
                selected: !gridView,
                onTap: gridView ? onToggleLayout : null,
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        PopupMenuButton<_CategorySort>(
          initialValue: sort,
          onSelected: onSort,
          icon: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: const Icon(Icons.sort_rounded, size: 20),
          ),
          itemBuilder: (_) => [
            PopupMenuItem(value: _CategorySort.featured, child: Text(context.tr.get('app.sort.featured'))),
            PopupMenuItem(value: _CategorySort.rating, child: Text(context.tr.get('app.sort.rating'))),
            PopupMenuItem(value: _CategorySort.priceLow, child: Text(context.tr.get('kitchen.sortPriceAsc'))),
            PopupMenuItem(value: _CategorySort.priceHigh, child: Text(context.tr.get('kitchen.sortPriceDesc'))),
            PopupMenuItem(value: _CategorySort.name, child: Text(context.tr.get('app.sort.name'))),
          ],
        ),
      ],
    );
  }
}

class _LayoutToggle extends StatelessWidget {
  const _LayoutToggle({required this.icon, required this.selected, this.onTap});

  final IconData icon;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? AppColors.darkGreen : Colors.transparent,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Icon(icon, size: 20, color: selected ? Colors.white : AppColors.textMuted),
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip(this.label, this.selected, this.onTap);

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => onTap(),
        showCheckmark: false,
        selectedColor: AppColors.darkGreen,
        backgroundColor: Colors.white,
        labelStyle: TextStyle(
          fontWeight: FontWeight.w600,
          fontSize: 13,
          color: selected ? Colors.white : AppColors.text,
        ),
        side: BorderSide(color: selected ? AppColors.darkGreen : AppColors.border),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
    );
  }
}
