import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../data/pharmacy.dart';
import '../i18n/app_strings.dart';
import '../providers/paginated_products_provider.dart';
import '../utils/cart_feedback.dart';
import '../widgets/loading_view.dart';
import '../widgets/product_grid.dart';
import '../widgets/products_load_more.dart';
import '../widgets/shop_mode_switch.dart';
import '../utils/shop_mode.dart';

enum _Sort { featured, priceLow, priceHigh, name }

const pharmacyAccent = Color(0xFF1F6B4A);

/// One pharmacy aisle, or the whole pharmacy catalogue when [aisleId] is null.
class PharmacyAisleScreen extends ConsumerStatefulWidget {
  const PharmacyAisleScreen({super.key, this.aisleId, this.dealsOnly = false});

  final String? aisleId;
  final bool dealsOnly;

  @override
  ConsumerState<PharmacyAisleScreen> createState() =>
      _PharmacyAisleScreenState();
}

class _PharmacyAisleScreenState extends ConsumerState<PharmacyAisleScreen> {
  final _scrollController = ScrollController();
  InfiniteScrollListener? _scrollListener;
  _Sort _sort = _Sort.featured;
  late bool _dealsOnly = widget.dealsOnly;

  ProductsQuery get _query => ProductsQuery(
        shop: 'pharmacy',
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
        widget.aisleId == null ? null : pharmacyAisleById(widget.aisleId!);
    final title = aisle == null
        ? s.or('pharmacy.navAll', 'All pharmacy products')
        : '${aisle.icon} ${s.or('pharmacy.aisles.${aisle.id}', aisle.title)}';
    final products = state.items;

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: Text(title),
        backgroundColor: AppColors.canvas,
      ),
      body: RefreshIndicator(
        color: pharmacyAccent,
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
                    if (widget.aisleId == null) ...[
                      const ShopModeSwitch(mode: ShopMode.pharmacy),
                      const SizedBox(height: 12),
                    ],
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          FilterChip(
                            label: Text(s.get('kitchen.offersOnly')),
                            selected: _dealsOnly,
                            onSelected: (v) => setState(() => _dealsOnly = v),
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
                              onSelected: (_) => setState(() => _sort = sort),
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
                child:
                    ErrorView(message: state.error!, onRetry: notifier.refresh),
              )
            else if (products.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                    child: Text(
                        s.or('pharmacy.empty', 'Nothing in this aisle yet.'))),
              )
            else
              PopularProductSliverGrid(
                products: products,
                onAdd: (p) => addToCartWithFeedback(context, ref, p),
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
                mainAxisExtent: 416,
                imageSize: 220,
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
      ),
    );
  }
}

class PharmacyCategoriesScreen extends StatelessWidget {
  const PharmacyCategoriesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final s = context.tr;
    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: Text(s.or('pharmacy.navCategories', 'All aisles')),
        backgroundColor: AppColors.canvas,
      ),
      body: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            const ShopModeSwitch(mode: ShopMode.pharmacy),
            const SizedBox(height: 12),
            for (final aisle in pharmacyAisles)
              ListTile(
                leading: Text(aisle.icon, style: const TextStyle(fontSize: 22)),
                title: Text(s.or('pharmacy.aisles.${aisle.id}', aisle.title)),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push(pharmacyAislePath(aisle.id)),
              ),
          ],
        ),
    );
  }
}
