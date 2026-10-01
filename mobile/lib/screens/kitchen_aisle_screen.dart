import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../data/kitchen_ware.dart';
import '../i18n/app_strings.dart';
import '../models/product.dart';
import '../providers/paginated_products_provider.dart';
import '../utils/cart_feedback.dart';
import '../utils/kitchen_mode.dart';
import '../widgets/loading_view.dart';
import '../widgets/product_grid.dart';
import '../widgets/products_load_more.dart';

enum _KitchenFilter { all, deals, prime, inStock }

enum _KitchenSort { featured, priceLow, priceHigh, name, rating }

/// One kitchen aisle, paged straight from the server.
class KitchenAisleScreen extends StatelessWidget {
  const KitchenAisleScreen({super.key, required this.aisleId});

  final String aisleId;

  @override
  Widget build(BuildContext context) => _KitchenFeed(aisleId: aisleId);
}

/// Full kitchen catalog (all aisles), optional deals-only.
class KitchenProductsScreen extends StatelessWidget {
  const KitchenProductsScreen({super.key, this.dealsOnly = false});

  final bool dealsOnly;

  @override
  Widget build(BuildContext context) => _KitchenFeed(dealsOnly: dealsOnly);
}

class _KitchenFeed extends ConsumerStatefulWidget {
  const _KitchenFeed({this.aisleId, this.dealsOnly = false});

  final String? aisleId;
  final bool dealsOnly;

  @override
  ConsumerState<_KitchenFeed> createState() => _KitchenFeedState();
}

class _KitchenFeedState extends ConsumerState<_KitchenFeed> {
  final _scrollController = ScrollController();
  InfiniteScrollListener? _scrollListener;
  late _KitchenFilter _filter = widget.dealsOnly ? _KitchenFilter.deals : _KitchenFilter.all;
  _KitchenSort _sort = _KitchenSort.featured;

  ProductsQuery get _query => ProductsQuery(shop: 'kitchen', aisle: widget.aisleId);

  PaginatedProductsNotifier get _notifier => ref.read(paginatedProductsProvider(_query).notifier);

  @override
  void initState() {
    super.initState();
    _scrollListener = InfiniteScrollListener(
      controller: _scrollController,
      onLoadMore: () => _notifier.loadMore(),
    );
  }

  @override
  void dispose() {
    _scrollListener?.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  List<Product> _apply(List<Product> products, AppStrings s) {
    var list = switch (_filter) {
      _KitchenFilter.all => [...products],
      _KitchenFilter.deals =>
        products.where((p) => p.originalPrice != null && p.originalPrice! > p.price).toList(),
      _KitchenFilter.prime => products.where((p) => p.prime).toList(),
      _KitchenFilter.inStock => products.where((p) => p.inStock).toList(),
    };
    switch (_sort) {
      case _KitchenSort.priceLow:
        list.sort((a, b) => a.price.compareTo(b.price));
      case _KitchenSort.priceHigh:
        list.sort((a, b) => b.price.compareTo(a.price));
      case _KitchenSort.name:
        list.sort((a, b) => s.productTitle(a).compareTo(s.productTitle(b)));
      case _KitchenSort.rating:
        list.sort((a, b) => b.rating.compareTo(a.rating));
      case _KitchenSort.featured:
        list = sortKitchenWithSaucepansFirst(list);
    }
    return list;
  }

  /// Filters can leave too few items to scroll, so the scroll trigger never fires.
  void _topUpIfShort(PaginatedProductsState state, int visible) {
    if (visible >= 12 || !state.hasMore || state.isLoadingMore || state.isInitialLoading) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _notifier.loadMore();
    });
  }

  @override
  Widget build(BuildContext context) {
    final s = context.tr;
    final state = ref.watch(paginatedProductsProvider(_query));
    final aisle = widget.aisleId == null ? null : kitchenAisleById(widget.aisleId!);
    final accent = Color(aisle?.accentArgb ?? 0xFF2E5E4A);

    final Widget header = widget.aisleId != null
        ? SliverAppBar(
            pinned: true,
            expandedHeight: 140,
            backgroundColor: accent,
            foregroundColor: Colors.white,
            flexibleSpace: FlexibleSpaceBar(
              title: Text(
                '${aisle?.icon ?? '🍳'} ${aisle != null ? s.kitchenAisle(aisle.id, aisle.title) : s.get('kitchen.aisleOf')}',
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
              background: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [accent, accent.withValues(alpha: 0.75)],
                  ),
                ),
              ),
            ),
          )
        : SliverAppBar(
            pinned: true,
            backgroundColor: AppColors.canvas,
            title: Text(s.get(widget.dealsOnly ? 'kitchen.kicker' : 'kitchen.home.allCategories')),
            actions: [
              IconButton(
                icon: const Icon(Icons.search_rounded),
                onPressed: () => context.push('/kitchen/search'),
              ),
            ],
          );

    if (state.isInitialLoading) {
      return Scaffold(
        backgroundColor: AppColors.canvas,
        body: CustomScrollView(
          slivers: [
            header,
            SliverFillRemaining(
              hasScrollBody: false,
              child: LoadingView(message: s.get('common.loading')),
            ),
          ],
        ),
      );
    }
    if (state.error != null && state.items.isEmpty) {
      return Scaffold(
        backgroundColor: AppColors.canvas,
        appBar: AppBar(),
        body: ErrorView(message: state.error!, onRetry: () => _notifier.refresh()),
      );
    }

    final products = _apply(state.items, s);
    _topUpIfShort(state, products.length);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: RefreshIndicator(
        onRefresh: () => _notifier.refresh(),
        child: CustomScrollView(
          controller: _scrollController,
          slivers: [
            header,
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      s.t('kitchen.categoryCount', {'count': state.total}),
                      style: const TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final f in _KitchenFilter.values)
                          ChoiceChip(
                            label: Text(s.get(switch (f) {
                              _KitchenFilter.all => 'app.filter.all',
                              _KitchenFilter.deals => 'app.filter.deals',
                              _KitchenFilter.prime => 'app.filter.prime',
                              _KitchenFilter.inStock => 'app.filter.inStock',
                            })),
                            selected: _filter == f,
                            onSelected: (_) => setState(() => _filter = f),
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonHideUnderline(
                      child: DropdownButton<_KitchenSort>(
                        value: _sort,
                        items: [
                          DropdownMenuItem(value: _KitchenSort.featured, child: Text(s.get('kitchen.sortTop'))),
                          DropdownMenuItem(value: _KitchenSort.priceLow, child: Text(s.get('kitchen.sortPriceAsc'))),
                          DropdownMenuItem(value: _KitchenSort.priceHigh, child: Text(s.get('kitchen.sortPriceDesc'))),
                          DropdownMenuItem(value: _KitchenSort.name, child: Text(s.get('kitchen.sortName'))),
                          DropdownMenuItem(value: _KitchenSort.rating, child: Text(s.get('app.sort.rating'))),
                        ],
                        onChanged: (v) {
                          if (v != null) setState(() => _sort = v);
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (products.isEmpty && !state.hasMore)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Text(s.get(state.items.isEmpty ? 'kitchen.empty' : 'kitchen.noFilterResults')),
                ),
              )
            else
              ProductSliverGrid(
                products: products,
                onAdd: (p) => addToCartWithFeedback(context, ref, p),
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              ),
            ProductsLoadMoreSliver(
              isLoadingMore: state.isLoadingMore,
              hasMore: state.hasMore,
              itemCount: state.items.length,
              total: state.total,
            ),
          ],
        ),
      ),
    );
  }
}
