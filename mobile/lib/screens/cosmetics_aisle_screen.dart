import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../data/cosmetics.dart';
import '../i18n/app_strings.dart';
import '../providers/paginated_products_provider.dart';
import '../utils/cart_feedback.dart';
import '../utils/responsive.dart';
import '../utils/shop_mode.dart';
import '../widgets/loading_view.dart';
import '../widgets/product_grid.dart';
import '../widgets/products_load_more.dart';
import '../widgets/shop_mode_switch.dart';
import 'cosmetics_home_screen.dart' show cosmeticsAccent;

enum _Sort { featured, priceLow, priceHigh, name }

/// One cosmetics aisle, or the whole cosmetics catalogue when [aisleId] is null.
class CosmeticsAisleScreen extends ConsumerStatefulWidget {
  const CosmeticsAisleScreen({super.key, this.aisleId, this.dealsOnly = false});

  final String? aisleId;
  final bool dealsOnly;

  @override
  ConsumerState<CosmeticsAisleScreen> createState() =>
      _CosmeticsAisleScreenState();
}

class _CosmeticsAisleScreenState extends ConsumerState<CosmeticsAisleScreen> {
  final _scrollController = ScrollController();
  InfiniteScrollListener? _scrollListener;
  _Sort _sort = _Sort.featured;
  late bool _dealsOnly = widget.dealsOnly;
  bool _contentShown = false;

  /// Offers filter and sort run server-side so every page is already filtered.
  ProductsQuery get _query => ProductsQuery(
        shop: 'cosmetics',
        aisle: widget.aisleId,
        sale: _dealsOnly,
        sort: switch (_sort) {
          _Sort.featured => 'top',
          _Sort.priceLow => 'price-asc',
          _Sort.priceHigh => 'price-desc',
          _Sort.name => 'name',
        },
      );

  @override
  void initState() {
    super.initState();
    _scrollListener = InfiniteScrollListener(
      controller: _scrollController,
      onLoadMore: () =>
          ref.read(paginatedProductsProvider(_query).notifier).loadMore(),
    );
  }

  @override
  void dispose() {
    _scrollListener?.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = context.tr;
    final query = _query;
    final state = ref.watch(paginatedProductsProvider(query));
    final notifier = ref.read(paginatedProductsProvider(query).notifier);
    final aisle =
        widget.aisleId == null ? null : cosmeticsAisleById(widget.aisleId!);
    final title = aisle == null
        ? s.get('cosmetics.navAll')
        : '${aisle.icon} ${s.cosmeticsAisle(aisle.id, aisle.title)}';
    final products = state.items;
    final isTab = widget.aisleId == null;
    final feedPending =
        state.isInitialLoading || (state.hasMore && state.error == null);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text(title),
        backgroundColor: Colors.white,
        automaticallyImplyLeading: !isTab,
        actions: [
          IconButton(
            icon: const Icon(Icons.search_rounded),
            onPressed: () => context.push('/cosmetics/search'),
          ),
        ],
      ),
      body: Builder(
        builder: (context) {
          if (state.isInitialLoading && !_contentShown) {
            return LoadingView(message: s.get('common.loading'));
          }
          if (state.error != null && state.items.isEmpty && !_contentShown) {
            return ErrorView(
              message: state.error!,
              onRetry: notifier.refresh,
            );
          }
          _contentShown = true;
          _scrollListener?.scheduleCheck();
          return RefreshIndicator(
            color: cosmeticsAccent,
            onRefresh: notifier.refresh,
            child: CustomScrollView(
              controller: _scrollController,
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (isTab) ...[
                          const ShopModeSwitch(mode: ShopMode.cosmetics),
                          const SizedBox(height: 12),
                        ],
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: [
                              FilterChip(
                                label: Text(s.get('kitchen.offersOnly')),
                                selected: _dealsOnly,
                                selectedColor:
                                    cosmeticsAccent.withValues(alpha: 0.18),
                                onSelected: (v) =>
                                    setState(() => _dealsOnly = v),
                              ),
                              const SizedBox(width: 8),
                              for (final (sort, key) in const [
                                (_Sort.featured, 'kitchen.sortTop'),
                                (_Sort.priceLow, 'kitchen.sortPriceAsc'),
                                (_Sort.priceHigh, 'kitchen.sortPriceDesc'),
                                (_Sort.name, 'kitchen.sortName'),
                              ]) ...[
                                ChoiceChip(
                                  label: Text(s.get(key)),
                                  selected: _sort == sort,
                                  selectedColor:
                                      cosmeticsAccent.withValues(alpha: 0.18),
                                  onSelected: (_) =>
                                      setState(() => _sort = sort),
                                ),
                                const SizedBox(width: 8),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                if (state.isInitialLoading)
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: LoadingView(message: s.get('common.loading')),
                  )
                else if (state.error != null && products.isEmpty)
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: ErrorView(
                        message: state.error!, onRetry: notifier.refresh),
                  )
                else if (products.isEmpty && !feedPending)
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Text(
                          s.get(_dealsOnly
                              ? 'kitchen.noFilterResults'
                              : 'cosmetics.empty'),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                  )
                else
                  PopularProductSliverGrid(
                    products: products,
                    onAdd: (p) => addToCartWithFeedback(context, ref, p),
                    addBelow: true,
                    mainAxisExtent: 348,
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
                  ),
                if (!state.isInitialLoading)
                  ProductsLoadMoreSliver(
                    isLoadingMore: state.isLoadingMore,
                    hasMore: state.hasMore,
                    itemCount: products.length,
                    total: state.total,
                    error: state.hasLoadMoreError ? state.error : null,
                    onRetry: notifier.retry,
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class CosmeticsCategoriesScreen extends StatelessWidget {
  const CosmeticsCategoriesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final s = context.tr;
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text(s.get('cosmetics.shopByCategory')),
        backgroundColor: Colors.white,
        automaticallyImplyLeading: false,
      ),
      body: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding:
                EdgeInsets.fromLTRB(16, 8, 16, shellBottomPadding(context)),
            children: [
              const ShopModeSwitch(mode: ShopMode.cosmetics),
              const SizedBox(height: 16),
              Text(
                s.get('cosmetics.zonesTitle'),
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 16),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: categoryGridCount(context),
                  mainAxisExtent: 104,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                ),
                itemCount: cosmeticsAisles.length + 1,
                itemBuilder: (context, index) {
                  final isAll = index == cosmeticsAisles.length;
                  final aisle = isAll ? null : cosmeticsAisles[index];
                  return Card(
                    clipBehavior: Clip.antiAlias,
                    child: InkWell(
                      onTap: () => isAll
                          ? context.go('/cosmetics/shop')
                          : context.push(cosmeticsAislePath(aisle!.id)),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              cosmeticsAccent.withValues(alpha: 0.12),
                              AppColors.surface
                            ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(isAll ? '🛍️' : aisle!.icon,
                                style: const TextStyle(fontSize: 26)),
                            Text(
                              isAll
                                  ? s.get('cosmetics.navAll')
                                  : s.cosmeticsAisle(aisle!.id, aisle.title),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w800, fontSize: 14),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
    );
  }
}
