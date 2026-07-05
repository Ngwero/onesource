import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../models/hero_slide.dart';
import '../models/product.dart';
import '../providers/cart_provider.dart';
import '../providers/hero_provider.dart';
import '../providers/paginated_products_provider.dart';
import '../providers/products_provider.dart';
import '../services/auth_service.dart';
import '../widgets/featured_carousel.dart';
import '../widgets/home_search_bar.dart';
import '../widgets/loading_view.dart';
import '../widgets/product_grid.dart';
import '../widgets/products_load_more.dart';
import '../widgets/promo_marquee.dart';
import '../widgets/scroll_slide_in.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final _scrollController = ScrollController();
  InfiniteScrollListener? _scrollListener;

  static const _query = ProductsQuery();

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

  void _addToCart(Product product) {
    ref.read(cartProvider.notifier).add(product);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${product.title} added to basket'),
        behavior: SnackBarBehavior.floating,
        backgroundColor: AppColors.darkGreen,
        action: SnackBarAction(label: 'View', textColor: AppColors.lemonGreen, onPressed: () => context.go('/cart')),
      ),
    );
  }

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
    final heroAsync = ref.watch(heroSlidesProvider);
    final profile = ref.watch(profileProvider).value;
    final user = ref.watch(authStateProvider).value?.session?.user;
    final greetingName = profile?.fullName?.split(' ').first ??
        user?.email?.split('@').first ??
        'Guest';

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
        },
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
                      child: _HomeHeader(
                        name: greetingName,
                        onAccount: () => context.go('/account'),
                      ),
                    ),
                    const SizedBox(height: 20),
                    const ScrollSlideIn(index: 1, child: HomeSearchBar()),
                    const SizedBox(height: 22),
                    ScrollSlideIn(
                      index: 2,
                      child: categoriesAsync.when(
                        loading: () => const SizedBox.shrink(),
                        error: (_, __) => const SizedBox.shrink(),
                        data: (categories) => _ExploreCategories(categories: categories),
                      ),
                    ),
                    const SizedBox(height: 20),
                    ScrollSlideIn(
                      index: 3,
                      child: heroAsync.when(
                        loading: () => const SizedBox.shrink(),
                        error: (_, __) => FeaturedCarousel(slides: HeroSlide.defaults),
                        data: (slides) => slides.isEmpty
                            ? const SizedBox.shrink()
                            : FeaturedCarousel(slides: slides),
                      ),
                    ),
                    const SizedBox(height: 14),
                    const ScrollSlideIn(index: 4, child: PromoMarquee()),
                    const SizedBox(height: 22),
                    ScrollSlideIn(
                      index: 5,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'You might need',
                            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.text),
                          ),
                          TextButton(
                            onPressed: () => context.go('/shop'),
                            child: const Text('See all'),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      productsState.total > 0
                          ? '${products.length} of ${productsState.total} loaded'
                          : '${products.length} products',
                      style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                    ),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            ),
            if (products.isEmpty)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(child: Text('No products in this category')),
              )
            else
              ProductSliverGrid(
                products: products,
                onAdd: _addToCart,
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 0),
              ),
            ProductsLoadMoreSliver(
              isLoadingMore: productsState.isLoadingMore,
              hasMore: productsState.hasMore,
              itemCount: products.length,
              total: productsState.total,
            ),
          ],
        ),
      ),
      ),
    );
  }
}

class _HomeHeader extends StatelessWidget {
  const _HomeHeader({required this.name, required this.onAccount});

  final String name;
  final VoidCallback onAccount;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        CircleAvatar(
          radius: 26,
          backgroundColor: Colors.transparent,
          child: Container(
            width: 52,
            height: 52,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: AppGradients.lemonAccent,
            ),
            alignment: Alignment.center,
            child: Text(
              name.isNotEmpty ? name[0].toUpperCase() : '?',
              style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.text, fontSize: 20),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Welcome Back', style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
              Text(
                name,
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.text),
              ),
            ],
          ),
        ),
        Material(
          color: Colors.white,
          shape: const CircleBorder(),
          child: InkWell(
            onTap: onAccount,
            customBorder: const CircleBorder(),
            child: Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(shape: BoxShape.circle, boxShadow: softCardShadow),
              child: const Icon(Icons.notifications_none_rounded, color: AppColors.darkGreen),
            ),
          ),
        ),
      ],
    );
  }
}

class _ExploreCategories extends StatelessWidget {
  const _ExploreCategories({required this.categories});

  final List<Category> categories;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Explore categories',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.text),
        ),
        const SizedBox(height: 14),
        SizedBox(
          height: 96,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              _CategoryCircle(
                label: 'All',
                icon: '🛒',
                slideIndex: 0,
                onTap: () => context.go('/categories'),
              ),
              for (var i = 0; i < categories.take(10).length; i++)
                _CategoryCircle(
                  label: categories[i].name,
                  icon: categories[i].icon,
                  slideIndex: i + 1,
                  onTap: () => context.push('/category/${categories[i].id}'),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _CategoryCircle extends StatelessWidget {
  const _CategoryCircle({
    required this.label,
    required this.icon,
    required this.onTap,
    this.slideIndex = 0,
  });

  final String label;
  final String icon;
  final VoidCallback onTap;
  final int slideIndex;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 16),
      child: ScrollSlideIn(
        index: slideIndex,
        axis: Axis.horizontal,
        child: GestureDetector(
          onTap: onTap,
          child: SizedBox(
            width: 68,
            child: Column(
              children: [
                Container(
                  width: 58,
                  height: 58,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: softCardShadow,
                    border: Border.all(color: AppColors.border),
                  ),
                  alignment: Alignment.center,
                  child: Text(icon, style: const TextStyle(fontSize: 26)),
                ),
                const SizedBox(height: 8),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
