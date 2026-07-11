import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../data/home_rows.dart';
import '../i18n/app_strings.dart';
import '../models/hero_slide.dart';
import '../models/product.dart';
import '../providers/cart_provider.dart';
import '../providers/hero_provider.dart';
import '../providers/paginated_products_provider.dart';
import '../providers/products_provider.dart';
import '../providers/search_catalog_provider.dart';
import '../services/auth_service.dart';
import '../widgets/category_marquee.dart';
import '../widgets/featured_carousel.dart';
import '../widgets/home_header.dart';
import '../widgets/home_product_row.dart';
import '../widgets/loading_view.dart';
import '../widgets/product_grid.dart';
import '../widgets/products_load_more.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final _scrollController = ScrollController();
  InfiniteScrollListener? _scrollListener;

  static const _query = ProductsQuery();
  static const _popularCount = 12;

  @override
  void initState() {
    super.initState();
    _scrollListener = InfiniteScrollListener(
      controller: _scrollController,
      onLoadMore: _loadMore,
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(searchCatalogProvider.future);
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

  @override
  Widget build(BuildContext context) {
    final query = _query;
    final productsState = ref.watch(paginatedProductsProvider(query));
    final catalogAsync = ref.watch(searchCatalogProvider);

    ref.listen(paginatedProductsProvider(query), (_, next) {
      if (next.items.isNotEmpty) {
        ref.read(cartProvider.notifier).restoreFromProducts(next.items);
      }
    });

    final categoriesAsync = ref.watch(categoriesProvider);
    final heroAsync = ref.watch(heroSlidesProvider);
    final profile = ref.watch(profileProvider).value;
    final user = ref.watch(authStateProvider).value?.session?.user;
    final greetingName = profile?.fullName?.split(' ').first ??
        user?.email?.split('@').first ??
        'Guest';
    final strings = ref.watch(stringsProvider);

    if (productsState.isInitialLoading) {
      return const Scaffold(
        backgroundColor: AppColors.canvas,
        body: LoadingView(message: 'Loading fresh produce…'),
      );
    }

    if (productsState.error != null && productsState.items.isEmpty) {
      return Scaffold(
        backgroundColor: AppColors.canvas,
        body: ErrorView(
          message: productsState.error.toString(),
          onRetry: () => ref.read(paginatedProductsProvider(query).notifier).refresh(),
        ),
      );
    }

    final products = productsState.items;
    final catalog = catalogAsync.valueOrNull ?? products;
    final popularProducts = products.take(_popularCount).toList();
    final moreProducts = products.length > _popularCount ? products.skip(_popularCount).toList() : <Product>[];
    final themedRows = homeProductRows
        .map((row) => (row: row, products: productsForHomeRow(catalog, row)))
        .where((entry) => entry.products.length >= 3)
        .toList();

    return Container(
      decoration: const BoxDecoration(gradient: AppGradients.canvas),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: RefreshIndicator(
          color: AppColors.leaf,
          onRefresh: () async {
            await ref.read(paginatedProductsProvider(query).notifier).refresh();
            ref.invalidate(categoriesProvider);
            ref.invalidate(heroSlidesProvider);
            ref.invalidate(searchCatalogProvider);
          },
          child: CustomScrollView(
            controller: _scrollController,
            slivers: [
              SliverToBoxAdapter(
                child: HomeHeader(
                  name: greetingName,
                  onAccount: () => context.go('/account'),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      categoriesAsync.when(
                        loading: () => const SizedBox(height: 120),
                        error: (_, __) => const SizedBox.shrink(),
                        data: (categories) => CategoryMarquee(categories: categories),
                      ),
                      const SizedBox(height: 22),
                      Text(
                        strings.specialOffers,
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.text),
                      ),
                      const SizedBox(height: 12),
                      heroAsync.when(
                        loading: () => const SizedBox(height: 220),
                        error: (_, __) => FeaturedCarousel(slides: HeroSlide.defaults),
                        data: (slides) => slides.isEmpty
                            ? const SizedBox.shrink()
                            : FeaturedCarousel(slides: slides),
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
                          HomeProductRow(
                            row: entry.row,
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
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.text),
                      ),
                      TextButton(
                        onPressed: () => context.go('/shop'),
                        child: Text(strings.viewAll),
                      ),
                    ],
                  ),
                ),
              ),
              if (popularProducts.isEmpty && themedRows.isEmpty)
                const SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(child: Text('No products available')),
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
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.text),
                        ),
                        TextButton(
                          onPressed: () => context.go('/shop'),
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
