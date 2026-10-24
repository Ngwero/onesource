import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../utils/cart_feedback.dart';
import '../models/product.dart';
import '../providers/paginated_products_provider.dart';
import '../widgets/home_search_bar.dart';
import '../widgets/horizontal_product_card.dart';
import '../widgets/loading_view.dart';
import '../widgets/product_card.dart';
import '../widgets/product_grid.dart';
import '../widgets/products_load_more.dart';
import '../widgets/scroll_slide_in.dart';
import '../utils/shop_mode.dart';
import '../widgets/shop_mode_switch.dart';

enum ShopFilter { all, deals, prime, inStock }

enum ShopSort { featured, priceLow, priceHigh, name }

class ProductsScreen extends ConsumerStatefulWidget {
  const ProductsScreen({super.key, this.dealsOnly = false});

  final bool dealsOnly;

  @override
  ConsumerState<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends ConsumerState<ProductsScreen> {
  ShopFilter _filter = ShopFilter.all;
  ShopSort _sort = ShopSort.featured;
  bool _gridView = true;
  final _scrollController = ScrollController();
  InfiniteScrollListener? _scrollListener;
  bool _contentShown = false;

  /// Deals/Prime and sort run server-side so every page is already filtered.
  ProductsQuery get _query => ProductsQuery(
        sale: _filter == ShopFilter.deals,
        prime: _filter == ShopFilter.prime,
        sort: switch (_sort) {
          ShopSort.featured => null,
          ShopSort.priceLow => 'price-asc',
          ShopSort.priceHigh => 'price-desc',
          ShopSort.name => 'name',
        },
      );

  @override
  void initState() {
    super.initState();
    if (widget.dealsOnly) _filter = ShopFilter.deals;
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
      ShopFilter.inStock => products.where((p) => p.inStock).toList(),
      _ => products,
    };
  }

  void _addToCart(Product product) => addToCartWithFeedback(context, ref, product);

  @override
  Widget build(BuildContext context) {
    final query = _query;
    final productsState = ref.watch(paginatedProductsProvider(query));
    final notifier = ref.read(paginatedProductsProvider(query).notifier);

    if (productsState.isInitialLoading && !_contentShown) {
      return Scaffold(
        backgroundColor: Colors.white,
        body: LoadingView(message: context.tr.get('common.loading')),
      );
    }

    if (productsState.error != null && productsState.items.isEmpty && !_contentShown) {
      return Scaffold(
        backgroundColor: Colors.white,
        body: ErrorView(
          message: productsState.error!,
          onRetry: notifier.refresh,
        ),
      );
    }

    _contentShown = true;
    final filtered = _applyFilter(productsState.items);
    final feedPending = productsState.isInitialLoading ||
        (productsState.hasMore && productsState.error == null);
    _scrollListener?.scheduleCheck();

    return Scaffold(
      backgroundColor: Colors.white,
      body: RefreshIndicator(
        onRefresh: notifier.refresh,
        child: CustomScrollView(
          controller: _scrollController,
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const ShopModeSwitch(mode: ShopMode.fresh),
                    const SizedBox(height: 12),
                    ScrollSlideIn(
                      index: 0,
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(context.tr.get('header.shopSwitcherLabel'), style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
                          ),
                          IconButton(
                            onPressed: () => setState(() => _gridView = !_gridView),
                            icon: Icon(_gridView ? Icons.view_list_rounded : Icons.grid_view_rounded),
                          ),
                          PopupMenuButton<ShopSort>(
                            initialValue: _sort,
                            onSelected: (v) => setState(() => _sort = v),
                            itemBuilder: (_) => [
                              PopupMenuItem(value: ShopSort.featured, child: Text(context.tr.get('app.sort.featured'))),
                              PopupMenuItem(value: ShopSort.priceLow, child: Text(context.tr.get('kitchen.sortPriceAsc'))),
                              PopupMenuItem(value: ShopSort.priceHigh, child: Text(context.tr.get('kitchen.sortPriceDesc'))),
                              PopupMenuItem(value: ShopSort.name, child: Text(context.tr.get('app.sort.name'))),
                            ],
                            child: const Padding(
                              padding: EdgeInsets.all(8),
                              child: Icon(Icons.sort_rounded),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    const ScrollSlideIn(index: 1, child: HomeSearchBar()),
                    const SizedBox(height: 14),
                    ScrollSlideIn(
                      index: 2,
                      child: SizedBox(
                        height: 40,
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          children: [
                            _Pill(context.tr.get('app.filter.all'), _filter == ShopFilter.all, () => setState(() => _filter = ShopFilter.all)),
                            _Pill(context.tr.get('app.filter.deals'), _filter == ShopFilter.deals, () => setState(() => _filter = ShopFilter.deals)),
                            _Pill(context.tr.get('app.filter.prime'), _filter == ShopFilter.prime, () => setState(() => _filter = ShopFilter.prime)),
                            _Pill(context.tr.get('app.filter.inStock'), _filter == ShopFilter.inStock, () => setState(() => _filter = ShopFilter.inStock)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (filtered.isEmpty && !feedPending) ...[
                      Text(
                        context.tr.get('kitchen.noFilterResults'),
                        style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                      ),
                      const SizedBox(height: 8),
                    ],
                  ],
                ),
              ),
            ),
            if (productsState.isInitialLoading)
              SliverFillRemaining(
                hasScrollBody: false,
                child: LoadingView(message: context.tr.get('common.loading')),
              )
            else if (productsState.error != null && productsState.items.isEmpty)
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

class _Pill extends StatelessWidget {
  const _Pill(this.label, this.selected, this.onTap);

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Material(
        color: selected ? AppColors.leaf : Colors.white,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(20),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              boxShadow: selected ? null : softCardShadow,
            ),
            child: Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: selected ? Colors.white : AppColors.text,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
