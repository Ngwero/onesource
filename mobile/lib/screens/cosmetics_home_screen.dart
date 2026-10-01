import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../data/cosmetics.dart';
import '../i18n/app_strings.dart';
import '../models/product.dart';
import '../providers/cosmetics_provider.dart';
import '../providers/paginated_products_provider.dart';
import '../services/auth_service.dart';
import '../utils/cart_feedback.dart';
import '../utils/shop_mode.dart';
import '../widgets/home_header.dart';
import '../widgets/popular_product_card.dart';
import '../widgets/product_grid.dart';
import '../widgets/products_load_more.dart';

const cosmeticsAccent = Color(0xFFC25480);

class CosmeticsHomeScreen extends ConsumerStatefulWidget {
  const CosmeticsHomeScreen({super.key});

  @override
  ConsumerState<CosmeticsHomeScreen> createState() => _CosmeticsHomeScreenState();
}

class _CosmeticsHomeScreenState extends ConsumerState<CosmeticsHomeScreen> {
  static const _query = ProductsQuery(shop: 'cosmetics');
  final _scrollController = ScrollController();
  InfiniteScrollListener? _scrollListener;

  @override
  void initState() {
    super.initState();
    _scrollListener = InfiniteScrollListener(
      controller: _scrollController,
      onLoadMore: () => ref.read(paginatedProductsProvider(_query).notifier).loadMore(),
    );
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
    final s = context.tr;
    final all = ref.watch(paginatedProductsProvider(_query));
    final offers = ref.watch(cosmeticsOffersProvider).valueOrNull ?? const <Product>[];
    final total = ref.watch(cosmeticsTotalProvider).valueOrNull;
    final profile = ref.watch(profileProvider).value;
    final user = ref.watch(authStateProvider).value?.session?.user;
    final greetingName = profile?.fullName?.split(' ').first ??
        user?.email?.split('@').first ??
        s.get('app.common.guest');

    return Container(
      decoration: const BoxDecoration(gradient: AppGradients.canvas),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: RefreshIndicator(
          color: cosmeticsAccent,
          onRefresh: () async {
            ref.invalidate(cosmeticsOffersProvider);
            ref.invalidate(cosmeticsTotalProvider);
            for (final aisle in cosmeticsAisles) {
              ref.invalidate(cosmeticsAisleRowProvider(aisle.id));
            }
            await ref.read(paginatedProductsProvider(_query).notifier).refresh();
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
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                      ),
                      if (total != null && total > 0) ...[
                        const SizedBox(height: 4),
                        Text(
                          s.t('cosmetics.catalogSub', {'count': total}),
                          style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SliverToBoxAdapter(child: _AisleChips()),
              const SliverToBoxAdapter(child: CosmeticsHeroCarousel()),
              if (offers.isNotEmpty)
                SliverToBoxAdapter(
                  child: _ProductRow(
                    title: '🏷️ ${s.get('cosmetics.hero.offersCta')}',
                    products: offers,
                    onAdd: _addToCart,
                    onSeeAll: () => context.go('/cosmetics/shop'),
                  ),
                ),
              for (final aisle in cosmeticsAisles)
                SliverToBoxAdapter(
                  child: _AisleRow(aisle: aisle, onAdd: _addToCart),
                ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 4),
                  child: Text(
                    s.get('cosmetics.navAll'),
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                  ),
                ),
              ),
              if (all.isInitialLoading)
                const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.all(32),
                    child: Center(child: CircularProgressIndicator(color: cosmeticsAccent)),
                  ),
                )
              else if (all.items.isEmpty)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Text(s.get('cosmetics.empty'), textAlign: TextAlign.center),
                  ),
                )
              else
                PopularProductSliverGrid(
                  products: all.items,
                  onAdd: _addToCart,
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                ),
              ProductsLoadMoreSliver(
                isLoadingMore: all.isLoadingMore,
                hasMore: all.hasMore,
                itemCount: all.items.length,
                total: all.total,
              ),
            ],
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
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 10),
        itemCount: cosmeticsAisles.length + 1,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          if (index == 0) {
            return ActionChip(
              avatar: const Icon(Icons.grid_view_rounded, size: 16, color: cosmeticsAccent),
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
        },
      ),
    );
  }
}

class _AisleRow extends ConsumerWidget {
  const _AisleRow({required this.aisle, required this.onAdd});

  final CosmeticsAisle aisle;
  final void Function(Product) onAdd;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final page = ref.watch(cosmeticsAisleRowProvider(aisle.id)).valueOrNull;
    if (page == null || page.products.isEmpty) return const SizedBox.shrink();
    final s = context.tr;
    return _ProductRow(
      title: '${aisle.icon} ${s.cosmeticsAisle(aisle.id, aisle.title)}',
      subtitle: s.t('kitchen.categoryCount', {'count': page.total}),
      products: page.products,
      onAdd: onAdd,
      onSeeAll: () => context.push(cosmeticsAislePath(aisle.id)),
    );
  }
}

class _ProductRow extends StatelessWidget {
  const _ProductRow({
    required this.title,
    required this.products,
    required this.onAdd,
    required this.onSeeAll,
    this.subtitle,
  });

  final String title;
  final String? subtitle;
  final List<Product> products;
  final void Function(Product) onAdd;
  final VoidCallback onSeeAll;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 18, 0, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                      ),
                      if (subtitle != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          subtitle!,
                          style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
                        ),
                      ],
                    ],
                  ),
                ),
                TextButton(
                  onPressed: onSeeAll,
                  style: TextButton.styleFrom(foregroundColor: cosmeticsAccent),
                  child: Text(
                    context.tr.get('cosmetics.seeAll'),
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 236,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.only(right: 20),
              itemCount: products.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                final product = products[index];
                return SizedBox(
                  width: 156,
                  child: PopularProductCard(product: product, onAdd: () => onAdd(product)),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
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
                          placeholder: (_, __) => Container(color: const Color(0xFFF6E7EE)),
                          errorWidget: (_, __, ___) => Container(color: const Color(0xFFF6E7EE)),
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
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
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
