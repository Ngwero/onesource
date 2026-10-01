import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../utils/cart_feedback.dart';
import '../data/home_rows.dart';
import '../i18n/app_strings.dart';
import '../models/hero_slide.dart';
import '../models/product.dart';
import '../providers/cart_provider.dart';
import '../providers/hero_provider.dart';
import '../providers/home_aisle_catalog_provider.dart';
import '../providers/paginated_products_provider.dart';
import '../providers/products_provider.dart';
import '../providers/search_catalog_provider.dart';
import '../services/auth_service.dart';
import '../utils/fresh_categories.dart';
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

  void _addToCart(Product product) => addToCartWithFeedback(context, ref, product);

  @override
  Widget build(BuildContext context) {
    final query = _query;
    final productsState = ref.watch(paginatedProductsProvider(query));

    ref.listen(paginatedProductsProvider(query), (_, next) {
      if (next.items.isNotEmpty) {
        ref.read(cartProvider.notifier).restoreFromProducts(next.items);
      }
    });

    final categoriesAsync = ref.watch(categoriesProvider);
    final heroAsync = ref.watch(heroSlidesProvider('home'));
    final profile = ref.watch(profileProvider).value;
    final user = ref.watch(authStateProvider).value?.session?.user;
    final greetingName = profile?.fullName?.split(' ').first ??
        user?.email?.split('@').first ??
        context.tr.get('app.common.guest');
    final strings = ref.watch(stringsProvider);

    if (productsState.isInitialLoading) {
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
                  onAccount: () => context.go('/account'),
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 48)),
              SliverToBoxAdapter(
                child: LoadingView(message: context.tr.get('common.loading')),
              ),
            ],
          ),
        ),
      );
    }

    if (productsState.error != null && productsState.items.isEmpty) {
      return Scaffold(
        backgroundColor: AppColors.canvas,
        body: ErrorView(
          message: productsState.error!,
          onRetry: () => ref.read(paginatedProductsProvider(query).notifier).refresh(),
        ),
      );
    }

    final products = productsState.items;
    // Seed chicken/meat/fish/etc. so aisle rows under Special Offers stay full.
    final aisleSeed = ref.watch(homeAisleCatalogProvider).valueOrNull ?? const [];
    final catalog = mergeProductPools(products, aisleSeed);
    final popularProducts = products.take(_popularCount).toList();
    final moreProducts = products.length > _popularCount ? products.skip(_popularCount).toList() : <Product>[];
    final themedRows = buildHomeThemedRows(catalog, minRows: 10);
    final produceCategories = diversifyFreshCategories(
      (categoriesAsync.valueOrNull ?? [])
          .where((c) => c.id != 'kitchen-ware' && c.id != 'kitchen-furniture')
          .map(
            (c) => Category(
              id: c.id,
              name: freshCategoryDisplayName(c),
              icon: c.icon,
              image: c.image,
            ),
          )
          .toList(),
    );

    return Container(
      decoration: const BoxDecoration(gradient: AppGradients.canvas),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: RefreshIndicator(
          color: AppColors.leaf,
          onRefresh: () async {
            await ref.read(paginatedProductsProvider(query).notifier).refresh();
            ref.invalidate(categoriesProvider);
            ref.invalidate(heroSlidesProvider('home'));
            ref.invalidate(homeAisleCatalogProvider);
            ref.invalidate(searchCatalogProvider('fresh'));
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
                  padding: const EdgeInsets.fromLTRB(20, 36, 20, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      CategoryMarquee(categories: produceCategories),
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
                      const SizedBox(height: 16),
                      _ExportsBanner(onTap: () => context.push('/exports')),
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
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(child: Text(context.tr.get('app.products.none'))),
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

class _ExportsBanner extends StatelessWidget {
  const _ExportsBanner({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final s = context.tr;
    return Material(
      color: const Color(0xFF064E3B),
      borderRadius: BorderRadius.circular(20),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 12, 14),
          child: Row(
            children: [
              const Text('✈️', style: TextStyle(fontSize: 28)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      s.get('exports.hero.kicker').toUpperCase(),
                      style: const TextStyle(
                        color: Color(0xFFA7F3D0),
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.8,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      s.get('exports.hero.title'),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        height: 1.25,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded, color: Colors.white),
            ],
          ),
        ),
      ),
    );
  }
}
