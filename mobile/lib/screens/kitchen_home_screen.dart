import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../data/kitchen_ware.dart';
import '../i18n/app_strings.dart';
import '../models/hero_slide.dart';
import '../models/product.dart';
import '../providers/cart_provider.dart';
import '../providers/hero_provider.dart';
import '../providers/kitchen_catalog_provider.dart';
import '../providers/paginated_products_provider.dart';
import '../services/auth_service.dart';
import '../utils/kitchen_mode.dart';
import '../widgets/category_marquee.dart';
import '../widgets/featured_carousel.dart';
import '../widgets/home_header.dart';
import '../widgets/loading_view.dart';
import '../widgets/popular_product_card.dart';
import '../widgets/product_grid.dart';
import '../widgets/products_load_more.dart';

/// Kitchen home — same layout as Fresh produce home, kitchen content only.
class KitchenHomeScreen extends ConsumerStatefulWidget {
  const KitchenHomeScreen({super.key});

  @override
  ConsumerState<KitchenHomeScreen> createState() => _KitchenHomeScreenState();
}

class _KitchenHomeScreenState extends ConsumerState<KitchenHomeScreen> {
  final _scrollController = ScrollController();
  InfiniteScrollListener? _scrollListener;

  static const _query = ProductsQuery(shop: 'kitchen');
  static const _popularCount = 12;

  @override
  void initState() {
    super.initState();
    _scrollListener = InfiniteScrollListener(
      controller: _scrollController,
      onLoadMore: _loadMore,
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(kitchenCatalogNotifierProvider.notifier).ensureLoaded();
    });
  }

  void _loadMore() {
    ref.read(paginatedProductsProvider(_query).notifier).loadMore();
  }

  @override
  void dispose() {
    _scrollListener?.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _addToCart(Product product) {
    ref.read(cartProvider.notifier).add(product);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${product.title} added to basket'),
        behavior: SnackBarBehavior.floating,
        backgroundColor: AppColors.darkGreen,
        action: SnackBarAction(
          label: 'View',
          textColor: AppColors.lemonGreen,
          onPressed: () => context.go('/cart'),
        ),
      ),
    );
  }

  List<Category> get _kitchenCategories => [
        for (final aisle in kitchenWareAisles)
          Category(id: aisle.id, name: aisle.title, icon: aisle.icon),
      ];

  @override
  Widget build(BuildContext context) {
    final query = _query;
    final productsState = ref.watch(paginatedProductsProvider(query));
    final catalogState = ref.watch(kitchenCatalogNotifierProvider);
    final catalogAsync = ref.watch(kitchenCatalogProvider);
    final heroAsync = ref.watch(heroSlidesProvider('kitchen'));
    final strings = ref.watch(stringsProvider);
    final profile = ref.watch(profileProvider).value;
    final user = ref.watch(authStateProvider).value?.session?.user;
    final greetingName = profile?.fullName?.split(' ').first ??
        user?.email?.split('@').first ??
        'Guest';

    ref.listen(paginatedProductsProvider(query), (_, next) {
      if (next.items.isNotEmpty) {
        ref.read(cartProvider.notifier).restoreFromProducts(next.items);
      }
    });

    final waitingForAisles =
        catalogState.isInitialLoading && catalogState.products.isEmpty;
    if ((productsState.isInitialLoading && productsState.items.isEmpty) ||
        waitingForAisles) {
      return Container(
        decoration: const BoxDecoration(gradient: AppGradients.canvas),
        child: Scaffold(
          backgroundColor: Colors.transparent,
          body: CustomScrollView(
            physics: const NeverScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: HomeHeader(
                  name: greetingName,
                  kitchenMode: true,
                  onAccount: () => context.go('/account'),
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 48)),
              const SliverToBoxAdapter(
                child: LoadingView(message: 'Loading kitchen ware…'),
              ),
            ],
          ),
        ),
      );
    }

    if (productsState.error != null &&
        productsState.items.isEmpty &&
        catalogState.products.isEmpty) {
      return Scaffold(
        backgroundColor: AppColors.canvas,
        body: ErrorView(
          message: productsState.error!,
          onRetry: () {
            ref.read(paginatedProductsProvider(query).notifier).refresh();
            ref.read(kitchenCatalogNotifierProvider.notifier).refresh();
          },
        ),
      );
    }

    final products = sortKitchenWithSaucepansFirst(productsState.items);
    final catalog = sortKitchenWithSaucepansFirst(
      catalogAsync.valueOrNull ?? const <Product>[],
    );
    final feed = catalog.isNotEmpty ? catalog : products;
    final popularProducts = diversifyKitchenProducts(feed, limit: _popularCount);
    final popularIds = popularProducts.map((p) => p.id).toSet();
    final moreProducts = diversifyKitchenProducts(
      feed.where((p) => !popularIds.contains(p.id)).toList(),
      limit: 36,
    );

    // Always list every kitchen subcategory row (same idea as Fresh home rows).
    final themedRows = <({KitchenAisle aisle, List<Product> products})>[
      for (final aisle in kitchenWareAisles)
        (
          aisle: aisle,
          products: filterKitchenAisle(feed, aisle.id).take(14).toList(),
        ),
    ].where((e) => e.products.isNotEmpty).toList();

    return Container(
      decoration: const BoxDecoration(gradient: AppGradients.canvas),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: RefreshIndicator(
          color: AppColors.leaf,
          onRefresh: () async {
            await ref.read(paginatedProductsProvider(query).notifier).refresh();
            await ref.read(kitchenCatalogNotifierProvider.notifier).refresh();
            ref.invalidate(heroSlidesProvider('kitchen'));
          },
          child: CustomScrollView(
            controller: _scrollController,
            slivers: [
              SliverToBoxAdapter(
                child: HomeHeader(
                  name: greetingName,
                  kitchenMode: true,
                  onAccount: () => context.go('/account'),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 36, 20, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      CategoryMarquee(
                        categories: _kitchenCategories,
                        allPath: '/kitchen/categories',
                        categoryPathBuilder: (c) => kitchenAislePath(c.id),
                      ),
                      const SizedBox(height: 22),
                      Text(
                        strings.specialOffers,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppColors.text,
                        ),
                      ),
                      const SizedBox(height: 12),
                      FeaturedCarousel(
                        slides: heroAsync.when(
                          loading: () => HeroSlide.kitchenDefaults,
                          error: (_, __) => HeroSlide.kitchenDefaults,
                          data: (slides) =>
                              slides.isEmpty ? HeroSlide.kitchenDefaults : slides,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              if (themedRows.isNotEmpty)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
                    child: Column(
                      children: [
                        for (final entry in themedRows)
                          _KitchenAisleProductRow(
                            aisle: entry.aisle,
                            products: entry.products,
                            onAdd: _addToCart,
                          ),
                      ],
                    ),
                  ),
                ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        strings.popularItems,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppColors.text,
                        ),
                      ),
                      TextButton(
                        onPressed: () => context.go('/kitchen/shop'),
                        child: Text(strings.viewAll),
                      ),
                    ],
                  ),
                ),
              ),
              if (popularProducts.isEmpty && themedRows.isEmpty)
                const SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(child: Text('No kitchen products available')),
                )
              else if (popularProducts.isNotEmpty)
                PopularProductSliverGrid(
                  products: popularProducts,
                  onAdd: _addToCart,
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                ),
              if (moreProducts.isNotEmpty) ...[
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          strings.moreToExplore,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: AppColors.text,
                          ),
                        ),
                        TextButton(
                          onPressed: () => context.go('/kitchen/shop'),
                          child: Text(strings.viewAll),
                        ),
                      ],
                    ),
                  ),
                ),
                PopularProductSliverGrid(
                  products: moreProducts,
                  onAdd: _addToCart,
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                ),
              ],
              ProductsLoadMoreSliver(
                isLoadingMore: productsState.isLoadingMore,
                hasMore: productsState.hasMore,
                itemCount: productsState.items.length,
                total: productsState.total,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _KitchenAisleProductRow extends ConsumerWidget {
  const _KitchenAisleProductRow({
    required this.aisle,
    required this.products,
    required this.onAdd,
  });

  final KitchenAisle aisle;
  final List<Product> products;
  final void Function(Product product) onAdd;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (products.isEmpty) return const SizedBox.shrink();
    final strings = ref.watch(stringsProvider);

    return Padding(
      padding: const EdgeInsets.only(bottom: 22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${aisle.icon} ${aisle.title}',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: AppColors.text,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${products.length}+ pieces in this aisle',
                      style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
                    ),
                  ],
                ),
              ),
              TextButton(
                onPressed: () => context.push(kitchenAislePath(aisle.id)),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.darkGreen,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: Text(
                  strings.seeAll,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 228,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: products.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                final product = products[index];
                return SizedBox(
                  width: 156,
                  child: PopularProductCard(
                    product: product,
                    onAdd: () => onAdd(product),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
