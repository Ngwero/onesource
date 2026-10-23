import 'dart:async';
import 'dart:math' as math;

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../data/cosmetics.dart';
import '../i18n/app_strings.dart';
import '../models/product.dart';
import '../providers/paginated_products_provider.dart';
import '../services/auth_service.dart';
import '../utils/cart_feedback.dart';
import '../utils/shop_mode.dart';
import '../widgets/compact_home_bar.dart';
import '../widgets/home_header.dart';
import '../widgets/loading_view.dart';
import '../widgets/popular_product_card.dart';
import '../widgets/product_grid.dart';
import '../widgets/products_load_more.dart';

const cosmeticsAccent = Color(0xFFC25480);

class CosmeticsHomeScreen extends ConsumerStatefulWidget {
  const CosmeticsHomeScreen({super.key});

  @override
  ConsumerState<CosmeticsHomeScreen> createState() =>
      _CosmeticsHomeScreenState();
}

class _CosmeticsHomeScreenState extends ConsumerState<CosmeticsHomeScreen> {
  static const _query = ProductsQuery(shop: 'cosmetics', sort: 'aisles');
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

  void _addToCart(Product product) =>
      addToCartWithFeedback(context, ref, product);

  @override
  Widget build(BuildContext context) {
    final s = context.tr;
    final all = ref.watch(paginatedProductsProvider(_query));
    if (all.items.isEmpty && all.error != null && !all.isInitialLoading) {
      return Scaffold(
        backgroundColor: AppColors.canvas,
        body: ErrorView(
          message: all.error!,
          onRetry: () => ref
              .read(paginatedProductsProvider(_query).notifier)
              .retry(),
        ),
      );
    }
    final offers = all.items
        .where((p) => p.originalPrice != null && p.originalPrice! > p.price)
        .take(14)
        .toList();
    final total = all.total > 0 ? all.total : null;
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
          mode: ShopMode.cosmetics,
          child: RefreshIndicator(
            color: cosmeticsAccent,
            onRefresh: () async {
              await ref
                  .read(paginatedProductsProvider(_query).notifier)
                  .refresh();
            },
            child: CustomScrollView(
              controller: _scrollController,
              slivers: [
                SliverToBoxAdapter(
                  child: HomeHeader(
                    name: greetingName,
                    mode: ShopMode.cosmetics,
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
                          s.get('cosmetics.title'),
                          style: const TextStyle(
                              fontSize: 22, fontWeight: FontWeight.w800),
                        ),
                        if (total != null && total > 0) ...[
                          const SizedBox(height: 4),
                          Text(
                            s.get('cosmetics.catalogSub'),
                            style: const TextStyle(
                                color: AppColors.textMuted, fontSize: 13),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                const SliverToBoxAdapter(child: _AisleChips()),
                const SliverToBoxAdapter(child: CosmeticsHeroCarousel()),
                for (final aisle in cosmeticsAisles)
                  SliverToBoxAdapter(
                    child: _AisleRow(
                      aisle: aisle,
                      products: all.items
                          .where((p) =>
                              cosmeticsAisleIdFromProductId(p.id) == aisle.id)
                          .take(14)
                          .toList(),
                      onAdd: _addToCart,
                    ),
                  ),
                if (offers.isNotEmpty)
                  SliverToBoxAdapter(
                    child: _ProductRow(
                      title: s.get('cosmetics.hero.offersCta'),
                      products: offers,
                      query: const ProductsQuery(shop: 'cosmetics', sale: true),
                      onAdd: _addToCart,
                      seeAllPath: '/cosmetics/products?sale=1',
                    ),
                  ),
                // Every cosmetics product, newest uploads first, growing endlessly as pages load.
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 4),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          s.get('cosmetics.home.latestTitle'),
                          style: const TextStyle(
                              fontSize: 18, fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          s.get('cosmetics.home.latestSub'),
                          style: const TextStyle(
                              color: AppColors.textMuted, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                ),
                if (all.isInitialLoading)
                  const SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.all(32),
                      child: Center(
                          child: CircularProgressIndicator(
                              color: cosmeticsAccent)),
                    ),
                  )
                else if (all.items.isEmpty)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Text(s.get('cosmetics.empty'),
                          textAlign: TextAlign.center),
                    ),
                  )
                else
                  PopularProductSliverGrid(
                    products: all.items,
                    onAdd: _addToCart,
                    addBelow: true,
                    mainAxisExtent: 348,
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                  ),
                if (!all.isInitialLoading)
                  ProductsLoadMoreSliver(
                    isLoadingMore: all.isLoadingMore,
                    hasMore: all.hasMore,
                    itemCount: all.items.length,
                    total: all.total,
                    error: all.hasLoadMoreError ? all.error : null,
                    onRetry: ref
                        .read(paginatedProductsProvider(_query).notifier)
                        .retry,
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Aisle chips that drift sideways in an endless loop. Touching (or hovering)
/// the strip holds it so it can be dragged and tapped; it resumes shortly after.
/// Stays a plain scroller when the system asks for reduced motion.
class _AisleChips extends StatefulWidget {
  const _AisleChips();

  @override
  State<_AisleChips> createState() => _AisleChipsState();
}

class _AisleChipsState extends State<_AisleChips>
    with SingleTickerProviderStateMixin {
  /// Logical pixels per second.
  static const _speed = 32.0;
  static const _resumeDelay = Duration(milliseconds: 2500);

  final _controller = ScrollController();
  late final Ticker _ticker = createTicker(_tick);
  Duration _lastTick = Duration.zero;
  Timer? _resumeTimer;
  bool _held = false;
  bool _animate = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final animate = !MediaQuery.disableAnimationsOf(context);
    if (animate == _animate) return;
    _animate = animate;
    if (animate) {
      _lastTick = Duration.zero;
      _ticker.start();
    } else {
      _ticker.stop();
    }
  }

  @override
  void dispose() {
    _resumeTimer?.cancel();
    _ticker.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _tick(Duration elapsed) {
    // Capped so an un-muted ticker (route shown again) doesn't leap ahead.
    final dt = math.min(
      (elapsed - _lastTick).inMicroseconds / Duration.microsecondsPerSecond,
      0.1,
    );
    _lastTick = elapsed;
    if (_held || !_controller.hasClients) return;
    final position = _controller.position;
    // Let a fling from the user's swipe finish before drifting again.
    if (position.isScrollingNotifier.value) return;
    _controller.jumpTo(position.pixels + _speed * dt);
  }

  void _hold() {
    _resumeTimer?.cancel();
    _held = true;
  }

  void _release() {
    _resumeTimer?.cancel();
    _resumeTimer = Timer(_resumeDelay, () => _held = false);
  }

  @override
  Widget build(BuildContext context) {
    final s = context.tr;
    final count = cosmeticsAisles.length + 1;
    return MouseRegion(
      onEnter: (_) => _hold(),
      onExit: (_) => _release(),
      child: Listener(
        onPointerDown: (_) => _hold(),
        onPointerUp: (_) => _release(),
        onPointerCancel: (_) => _release(),
        child: SizedBox(
          height: 64,
          child: ListView.builder(
            controller: _controller,
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(20, 14, 12, 10),
            // Unbounded while looping: chips repeat so the drift never runs out.
            itemCount: _animate ? null : count,
            itemBuilder: (context, i) => Padding(
              padding: const EdgeInsets.only(right: 8),
              child: _chip(context, s, i % count),
            ),
          ),
        ),
      ),
    );
  }

  Widget _chip(BuildContext context, AppStrings s, int index) {
    if (index == 0) {
      return ActionChip(
        avatar: const Icon(Icons.grid_view_rounded,
            size: 16, color: cosmeticsAccent),
        label: Text(s.get('cosmetics.navCategories')),
        onPressed: () => context.go('/cosmetics/categories'),
        backgroundColor: Colors.white,
        side: const BorderSide(color: AppColors.border),
      );
    }
    final aisle = cosmeticsAisles[index - 1];
    return ActionChip(
      avatar: Text(aisle.icon),
      label: Text(s.cosmeticsAisle(aisle.id, aisle.title)),
      onPressed: () => context.push(cosmeticsAislePath(aisle.id)),
      backgroundColor: Colors.white,
      side: const BorderSide(color: AppColors.border),
    );
  }
}

class _AisleRow extends StatelessWidget {
  const _AisleRow({
    required this.aisle,
    required this.products,
    required this.onAdd,
  });

  final CosmeticsAisle aisle;
  final List<Product> products;
  final void Function(Product) onAdd;

  @override
  Widget build(BuildContext context) {
    // The general cosmetics endpoint only contains the latest import batch,
    // so an aisle can be healthy while being absent from that first page.
    // Keep the two skincare shelves alive and let them fetch their scoped
    // feeds instead of disappearing with no way to start a request.
    final loadWhenEmpty =
        aisle.id == 'serums-oils' || aisle.id == 'sun-protection';
    if (products.isEmpty && !loadWhenEmpty) return const SizedBox.shrink();
    final s = context.tr;
    return _ProductRow(
      title: s.cosmeticsAisle(aisle.id, aisle.title),
      products: products,
      query: ProductsQuery(shop: 'cosmetics', aisle: aisle.id, pageSize: 6),
      onAdd: onAdd,
      loadWhenEmpty: loadWhenEmpty,
      seeAllPath: cosmeticsAislePath(aisle.id),
    );
  }
}

/// Horizontal row that starts from [products] and pages in more of [query]
/// whenever the user swipes close to its end, until every match is shown.
class _ProductRow extends ConsumerStatefulWidget {
  const _ProductRow({
    required this.title,
    required this.products,
    required this.query,
    required this.onAdd,
    this.loadWhenEmpty = false,
    this.seeAllPath,
  });

  final String title;
  final List<Product> products;
  final ProductsQuery query;
  final void Function(Product) onAdd;
  final bool loadWhenEmpty;
  final String? seeAllPath;

  @override
  ConsumerState<_ProductRow> createState() => _ProductRowState();
}

class _ProductRowState extends ConsumerState<_ProductRow> {
  static const _loadAheadPx = 400.0;

  final _controller = ScrollController();

  /// Paging starts on the first swipe near the end (or straight away if this
  /// row already paged earlier in the session).
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

    final strings = ref.watch(stringsProvider);
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  widget.title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: AppColors.text,
                  ),
                ),
              ),
              if (widget.seeAllPath != null)
                TextButton(
                  onPressed: () => context.push(widget.seeAllPath!),
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
            height: 284,
            child: ListView.separated(
              controller: _controller,
              scrollDirection: Axis.horizontal,
              itemCount: products.length +
                  skeletons +
                  (trailing && skeletons == 0 ? 1 : 0),
              separatorBuilder: (_, __) => const SizedBox(width: 16),
              itemBuilder: (context, index) {
                if (index >= products.length && skeletons > 0) {
                  return const _ShelfCardSkeleton(width: 156);
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
                                  color: cosmeticsAccent),
                            )
                          : const SizedBox(
                              width: 26,
                              height: 26,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                color: cosmeticsAccent,
                              ),
                            ),
                    ),
                  );
                }
                final product = products[index];
                return SizedBox(
                  width: 156,
                  child: PopularProductCard(
                    product: product,
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

/// Auto-playing banner carousel using the website's Cosmetics hero artwork.
class CosmeticsHeroCarousel extends StatefulWidget {
  const CosmeticsHeroCarousel({super.key});

  @override
  State<CosmeticsHeroCarousel> createState() => _CosmeticsHeroCarouselState();
}

class _CosmeticsHeroCarouselState extends State<CosmeticsHeroCarousel> {
  final _controller = PageController();
  Timer? _timer;
  int _index = 0;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 6), (_) {
      if (!_controller.hasClients) return;
      final next = (_index + 1) % cosmeticsHeroSlides.length;
      _controller.animateToPage(
        next,
        duration: const Duration(milliseconds: 450),
        curve: Curves.easeOutCubic,
      );
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = context.tr;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 6, 20, 0),
      child: Column(
        children: [
          AspectRatio(
            aspectRatio: 16 / 10,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: PageView.builder(
                controller: _controller,
                itemCount: cosmeticsHeroSlides.length,
                onPageChanged: (i) => setState(() => _index = i),
                itemBuilder: (context, i) {
                  final slide = cosmeticsHeroSlides[i];
                  final k = 'cosmetics.hero.${slide.key}';
                  return GestureDetector(
                    onTap: () => context.push(slide.href),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        CachedNetworkImage(
                          imageUrl: slide.image,
                          fit: BoxFit.cover,
                          placeholder: (_, __) =>
                              Container(color: const Color(0xFFF6E7EE)),
                          errorWidget: (_, __, ___) =>
                              Container(color: const Color(0xFFF6E7EE)),
                        ),
                        const DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.centerLeft,
                              end: Alignment.centerRight,
                              colors: [Color(0xCC1F1418), Color(0x001F1418)],
                            ),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(18),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.9),
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Text(
                                  s.get('${k}Badge'),
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    color: cosmeticsAccent,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 8),
                              SizedBox(
                                width: 230,
                                child: Text(
                                  s.get('${k}Title'),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 20,
                                    height: 1.15,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 4),
                              SizedBox(
                                width: 230,
                                child: Text(
                                  s.get('${k}Sub'),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.88),
                                    fontSize: 12.5,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 10),
                              FilledButton(
                                onPressed: () => context.push(slide.href),
                                style: FilledButton.styleFrom(
                                  backgroundColor: Colors.white,
                                  foregroundColor: AppColors.text,
                                  visualDensity: VisualDensity.compact,
                                ),
                                child: Text(s.get('${k}Cta')),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (var i = 0; i < cosmeticsHeroSlides.length; i++)
                AnimatedContainer(
                  duration: const Duration(milliseconds: 220),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: i == _index ? 20 : 7,
                  height: 7,
                  decoration: BoxDecoration(
                    color: i == _index ? cosmeticsAccent : AppColors.border,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
