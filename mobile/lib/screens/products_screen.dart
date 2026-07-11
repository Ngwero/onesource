import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../models/product.dart';
import '../providers/cart_provider.dart';
import '../providers/paginated_products_provider.dart';
import '../widgets/home_search_bar.dart';
import '../widgets/horizontal_product_card.dart';
import '../widgets/loading_view.dart';
import '../widgets/scroll_slide_in.dart';
import '../widgets/product_card.dart';
import '../widgets/product_grid.dart';
import '../widgets/products_load_more.dart';

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

  static const _query = ProductsQuery();

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
      ShopFilter.all => products,
      ShopFilter.deals => products.where((p) => p.originalPrice != null && p.originalPrice! > p.price).toList(),
      ShopFilter.prime => products.where((p) => p.prime).toList(),
      ShopFilter.inStock => products.where((p) => p.inStock).toList(),
    };
  }

  List<Product> _applySort(List<Product> products) {
    final list = [...products];
    switch (_sort) {
      case ShopSort.priceLow:
        list.sort((a, b) => a.price.compareTo(b.price));
      case ShopSort.priceHigh:
        list.sort((a, b) => b.price.compareTo(a.price));
      case ShopSort.name:
        list.sort((a, b) => a.title.compareTo(b.title));
      case ShopSort.featured:
        break;
    }
    return list;
  }

  void _addToCart(Product product) {
    ref.read(cartProvider.notifier).add(product);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${product.title} added'),
        behavior: SnackBarBehavior.floating,
        action: SnackBarAction(label: 'Basket', onPressed: () => context.go('/cart')),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final productsState = ref.watch(paginatedProductsProvider(_query));

    if (productsState.isInitialLoading) {
      return const Scaffold(
        backgroundColor: AppColors.canvas,
        body: LoadingView(message: 'Loading shop…'),
      );
    }

    if (productsState.error != null && productsState.items.isEmpty) {
      return Scaffold(
        backgroundColor: AppColors.canvas,
        body: ErrorView(
          message: productsState.error.toString(),
          onRetry: () => ref.read(paginatedProductsProvider(_query).notifier).refresh(),
        ),
      );
    }

    final filtered = _applySort(_applyFilter(productsState.items));

    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: RefreshIndicator(
        onRefresh: () => ref.read(paginatedProductsProvider(_query).notifier).refresh(),
        child: CustomScrollView(
          controller: _scrollController,
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ScrollSlideIn(
                      index: 0,
                      child: Row(
                        children: [
                          const Expanded(
                            child: Text('Shop', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
                          ),
                          IconButton(
                            onPressed: () => setState(() => _gridView = !_gridView),
                            icon: Icon(_gridView ? Icons.view_list_rounded : Icons.grid_view_rounded),
                          ),
                          PopupMenuButton<ShopSort>(
                            initialValue: _sort,
                            onSelected: (v) => setState(() => _sort = v),
                            itemBuilder: (_) => const [
                              PopupMenuItem(value: ShopSort.featured, child: Text('Featured')),
                              PopupMenuItem(value: ShopSort.priceLow, child: Text('Price: low to high')),
                              PopupMenuItem(value: ShopSort.priceHigh, child: Text('Price: high to low')),
                              PopupMenuItem(value: ShopSort.name, child: Text('Name A–Z')),
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
                            _Pill('All', _filter == ShopFilter.all, () => setState(() => _filter = ShopFilter.all)),
                            _Pill('Deals', _filter == ShopFilter.deals, () => setState(() => _filter = ShopFilter.deals)),
                            _Pill('Prime', _filter == ShopFilter.prime, () => setState(() => _filter = ShopFilter.prime)),
                            _Pill('In stock', _filter == ShopFilter.inStock, () => setState(() => _filter = ShopFilter.inStock)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      filtered.isEmpty
                          ? 'No products match your filters'
                          : productsState.total > 0
                              ? '${filtered.length} shown · ${productsState.items.length} of ${productsState.total} loaded'
                              : '${filtered.length} products',
                      style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                    ),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            ),
            if (filtered.isEmpty)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(child: Text('No products match your filters')),
              )
            else if (_gridView)
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
                sliver: SliverGrid(
                  gridDelegate: ProductGrid.gridDelegate,
                  delegate: SliverChildBuilderDelegate(
                    (context, index) => ScrollSlideIn(
                      index: index,
                      child: ProductCard(
                        product: filtered[index],
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
                          onBuy: () => _addToCart(product),
                        ),
                      );
                    },
                    childCount: filtered.length,
                  ),
                ),
              ),
            ProductsLoadMoreSliver(
              isLoadingMore: productsState.isLoadingMore,
              hasMore: productsState.hasMore,
              itemCount: productsState.items.length,
              total: productsState.total,
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
