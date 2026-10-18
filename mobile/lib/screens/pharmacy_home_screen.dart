import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../data/pharmacy.dart';
import '../i18n/app_strings.dart';
import '../models/hero_slide.dart';
import '../models/product.dart';
import '../providers/hero_provider.dart';
import '../providers/paginated_products_provider.dart';
import '../services/auth_service.dart';
import '../utils/cart_feedback.dart';
import '../utils/shop_mode.dart';
import '../widgets/compact_home_bar.dart';
import '../widgets/featured_carousel.dart';
import '../widgets/home_header.dart';
import '../widgets/popular_product_card.dart';
import '../widgets/products_load_more.dart';

const pharmacyAccent = Color(0xFF1F6B4A);

/// Pharmacy shop home: aisle chips and a sideways row of products per aisle.
class PharmacyHomeScreen extends ConsumerStatefulWidget {
  const PharmacyHomeScreen({super.key});

  @override
  ConsumerState<PharmacyHomeScreen> createState() => _PharmacyHomeScreenState();
}

class _PharmacyHomeScreenState extends ConsumerState<PharmacyHomeScreen> {
  static const _query = ProductsQuery(shop: 'pharmacy', sort: 'top');
  final _scrollController = ScrollController();
  InfiniteScrollListener? _scrollListener;

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

  void _addToCart(BuildContext context, WidgetRef ref, Product product) =>
      addToCartWithFeedback(context, ref, product);

  @override
  Widget build(BuildContext context) {
    final s = context.tr;
    final all = ref.watch(paginatedProductsProvider(_query));
    final heroAsync = ref.watch(heroSlidesProvider('pharmacy'));
    final offers = all.items
        .where((p) => p.originalPrice != null && p.originalPrice! > p.price)
        .take(14)
        .toList();
    final profile = ref.watch(profileProvider).valueOrNull;
    final user = ref.watch(authStateProvider).valueOrNull?.session?.user;
    final greetingName = profile?.fullName?.split(' ').first ??
        user?.email?.split('@').first ??
        s.get('app.common.guest');
    if (!all.isInitialLoading) _scrollListener?.scheduleCheck();

    return Container(
      decoration: const BoxDecoration(gradient: AppGradients.canvas),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: CompactHomeBarOverlay(
          mode: ShopMode.pharmacy,
          child: RefreshIndicator(
            color: pharmacyAccent,
            onRefresh: () async {
              await ref
                  .read(paginatedProductsProvider(_query).notifier)
                  .refresh();
              ref.invalidate(heroSlidesProvider('pharmacy'));
            },
            child: CustomScrollView(
              controller: _scrollController,
              slivers: [
                SliverToBoxAdapter(
                  child: HomeHeader(
                    name: greetingName,
                    mode: ShopMode.pharmacy,
                    onAccount: () => context.go('/account'),
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 40, 20, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          s.or('header.shopPharmacy', 'Pharmacy'),
                          style: const TextStyle(
                              fontSize: 22, fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          s.or('pharmacy.lede',
                              'Medicines, care and supplements.'),
                          style: const TextStyle(
                              color: AppColors.textMuted, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
                    child: FeaturedCarousel(
                      slides: heroAsync.when(
                        loading: () => HeroSlide.pharmacyDefaults,
                        error: (_, __) => HeroSlide.pharmacyDefaults,
                        data: (slides) => slides.isEmpty
                            ? HeroSlide.pharmacyDefaults
                            : slides,
                      ),
                    ),
                  ),
                ),
                const SliverToBoxAdapter(child: _AisleChips()),
                for (final aisle in pharmacyAisles)
                  SliverToBoxAdapter(
                    child: _AisleRow(
                      aisle: aisle,
                      products: all.items
                          .where((p) =>
                              pharmacyAisleIdFromProductId(p.id) == aisle.id)
                          .take(14)
                          .toList(),
                      onAdd: (product) => _addToCart(context, ref, product),
                    ),
                  ),
                if (offers.isNotEmpty)
                  SliverToBoxAdapter(
                    child: _ProductRow(
                      title: s.get('kitchen.home.feedOffers'),
                      products: offers,
                      query: const ProductsQuery(
                          shop: 'pharmacy', sale: true, sort: 'top'),
                      onAdd: (product) => _addToCart(context, ref, product),
                    ),
                  ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: TextButton(
                        onPressed: () => context.push('/pharmacy/shop'),
                        child: Text(
                            s.or('pharmacy.navAll', 'All pharmacy products')),
                      ),
                    ),
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

class _AisleChips extends StatelessWidget {
  const _AisleChips();

  @override
  Widget build(BuildContext context) {
    final s = context.tr;
    return SizedBox(
      height: 64,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(20, 14, 12, 10),
        children: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ActionChip(
              avatar: const Icon(Icons.grid_view_rounded,
                  size: 16, color: pharmacyAccent),
              label: Text(s.or('pharmacy.navCategories', 'All aisles')),
              onPressed: () => context.go('/pharmacy/categories'),
              backgroundColor: Colors.white,
              side: const BorderSide(color: AppColors.border),
            ),
          ),
          for (final aisle in pharmacyAisles)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ActionChip(
                avatar: Text(aisle.icon),
                label: Text(s.or('pharmacy.aisles.${aisle.id}', aisle.title)),
                onPressed: () => context.push(pharmacyAislePath(aisle.id)),
                backgroundColor: Colors.white,
                side: const BorderSide(color: AppColors.border),
              ),
            ),
        ],
      ),
    );
  }
}

class _AisleRow extends StatelessWidget {
  const _AisleRow({
    required this.aisle,
    required this.products,
    required this.onAdd,
  });

  final PharmacyAisle aisle;
  final List<Product> products;
  final void Function(Product) onAdd;

  @override
  Widget build(BuildContext context) {
    final s = context.tr;
    return _ProductRow(
      title:
          '${aisle.icon} ${s.or('pharmacy.aisles.${aisle.id}', aisle.title)}',
      products: products,
      query: ProductsQuery(
          shop: 'pharmacy', aisle: aisle.id, sort: 'top', pageSize: 8),
      onAdd: onAdd,
      loadWhenEmpty: products.isEmpty,
    );
  }
}

/// Horizontal row that starts from [products] and pages in more of [query].
class _ProductRow extends ConsumerStatefulWidget {
  const _ProductRow({
    required this.title,
    required this.products,
    required this.query,
    required this.onAdd,
    this.loadWhenEmpty = false,
  });

  final String title;
  final List<Product> products;
  final ProductsQuery query;
  final void Function(Product) onAdd;
  final bool loadWhenEmpty;

  @override
  ConsumerState<_ProductRow> createState() => _ProductRowState();
}

class _ProductRowState extends ConsumerState<_ProductRow> {
  static const _loadAheadPx = 400.0;

  final _controller = ScrollController();
  late bool _paging = widget.loadWhenEmpty ||
      ref.exists(paginatedProductsProvider(widget.query));

  @override
  void initState() {
    super.initState();
    _controller.addListener(_maybeLoadMore);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _maybeLoadMore() {
    if (!_controller.hasClients) return;
    if (_controller.position.extentAfter > _loadAheadPx) return;
    if (!_paging) {
      setState(() => _paging = true);
      return;
    }
    final feed = ref.read(paginatedProductsProvider(widget.query));
    if (feed.hasMore &&
        !feed.isInitialLoading &&
        !feed.isLoadingMore &&
        feed.error == null) {
      ref.read(paginatedProductsProvider(widget.query).notifier).loadMore();
    }
  }

  void _retry() =>
      ref.read(paginatedProductsProvider(widget.query).notifier).retry();

  @override
  Widget build(BuildContext context) {
    final feed =
        _paging ? ref.watch(paginatedProductsProvider(widget.query)) : null;
    final products = [...widget.products];
    if (feed != null) {
      final seen = products.map((p) => p.id).toSet();
      products.addAll(feed.items.where((p) => seen.add(p.id)));
    }
    final loading =
        feed != null && (feed.isInitialLoading || feed.isLoadingMore);
    final failed = feed != null && feed.error != null;
    final trailing = loading || failed;
    final skeletons = products.isEmpty && loading ? 3 : 0;
    if (feed != null && !trailing && feed.hasMore) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _maybeLoadMore();
      });
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 18, 0, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(right: 20),
            child: Text(
              widget.title,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 360,
            child: ListView.separated(
              controller: _controller,
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.only(right: 20),
              itemCount: products.length +
                  skeletons +
                  (trailing && skeletons == 0 ? 1 : 0),
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                if (index >= products.length && skeletons > 0) {
                  return const _ShelfCardSkeleton(width: 220);
                }
                if (index == products.length) {
                  return SizedBox(
                    width: 96,
                    child: Center(
                      child: failed
                          ? IconButton(
                              tooltip: context.tr.get('common.retry'),
                              onPressed: _retry,
                              icon: const Icon(Icons.refresh_rounded,
                                  color: pharmacyAccent),
                            )
                          : const SizedBox(
                              width: 26,
                              height: 26,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                color: pharmacyAccent,
                              ),
                            ),
                    ),
                  );
                }
                final product = products[index];
                return SizedBox(
                  width: 220,
                  child: PopularProductCard(
                    product: product,
                    imageSize: 220,
                    onAdd: () => widget.onAdd(product),
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

class _ShelfCardSkeleton extends StatelessWidget {
  const _ShelfCardSkeleton({required this.width});

  final double width;

  @override
  Widget build(BuildContext context) => Container(
        width: width,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: softCardShadow,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: AppColors.leafPale,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const SizedBox.expand(),
              ),
            ),
            const SizedBox(height: 12),
            Container(height: 12, decoration: _skeletonDecoration()),
            const SizedBox(height: 8),
            FractionallySizedBox(
              widthFactor: .68,
              child: Container(height: 12, decoration: _skeletonDecoration()),
            ),
            const SizedBox(height: 12),
            FractionallySizedBox(
              widthFactor: .5,
              child: Container(height: 16, decoration: _skeletonDecoration()),
            ),
          ],
        ),
      );

  static BoxDecoration _skeletonDecoration() => BoxDecoration(
        color: AppColors.muted,
        borderRadius: BorderRadius.circular(8),
      );
}
