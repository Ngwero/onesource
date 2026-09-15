import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../data/kitchen_ware.dart';
import '../models/product.dart';
import '../providers/cart_provider.dart';
import '../providers/kitchen_catalog_provider.dart';
import '../utils/kitchen_mode.dart';
import '../widgets/loading_view.dart';
import '../widgets/product_grid.dart';

enum _KitchenFilter { all, deals, prime, inStock }

enum _KitchenSort { featured, priceLow, priceHigh, name, rating }

class KitchenAisleScreen extends ConsumerStatefulWidget {
  const KitchenAisleScreen({super.key, required this.aisleId});

  final String aisleId;

  @override
  ConsumerState<KitchenAisleScreen> createState() => _KitchenAisleScreenState();
}

class _KitchenAisleScreenState extends ConsumerState<KitchenAisleScreen> {
  _KitchenFilter _filter = _KitchenFilter.all;
  _KitchenSort _sort = _KitchenSort.featured;

  List<Product> _applyFilter(List<Product> products) {
    return switch (_filter) {
      _KitchenFilter.all => products,
      _KitchenFilter.deals =>
        products.where((p) => p.originalPrice != null && p.originalPrice! > p.price).toList(),
      _KitchenFilter.prime => products.where((p) => p.prime).toList(),
      _KitchenFilter.inStock => products.where((p) => p.inStock).toList(),
    };
  }

  List<Product> _applySort(List<Product> products) {
    final list = [...products];
    switch (_sort) {
      case _KitchenSort.priceLow:
        list.sort((a, b) => a.price.compareTo(b.price));
      case _KitchenSort.priceHigh:
        list.sort((a, b) => b.price.compareTo(a.price));
      case _KitchenSort.name:
        list.sort((a, b) => a.title.compareTo(b.title));
      case _KitchenSort.rating:
        list.sort((a, b) => b.rating.compareTo(a.rating));
      case _KitchenSort.featured:
        return sortKitchenWithSaucepansFirst(list);
    }
    return list;
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
    final aisle = kitchenAisleById(widget.aisleId);
    final productsAsync = ref.watch(kitchenAisleProductsProvider(widget.aisleId));
    final title = aisle?.title ?? 'Kitchen aisle';
    final icon = aisle?.icon ?? '🍳';
    final accent = Color(aisle?.accentArgb ?? 0xFF2E5E4A);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: productsAsync.when(
        loading: () => const LoadingView(message: 'Loading aisle…'),
        error: (e, _) => ErrorView(
          message: e.toString(),
          onRetry: () => ref.read(kitchenCatalogNotifierProvider.notifier).refresh(),
        ),
        data: (raw) {
          final products = _applySort(_applyFilter(raw));
          return RefreshIndicator(
            onRefresh: () async => ref.read(kitchenCatalogNotifierProvider.notifier).refresh(),
            child: CustomScrollView(
              slivers: [
                SliverAppBar(
                  pinned: true,
                  expandedHeight: 140,
                  backgroundColor: accent,
                  foregroundColor: Colors.white,
                  flexibleSpace: FlexibleSpaceBar(
                    title: Text('$icon $title', style: const TextStyle(fontWeight: FontWeight.w800)),
                    background: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [accent, accent.withValues(alpha: 0.75)],
                        ),
                      ),
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${products.length} of ${raw.length} items',
                          style: const TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (final f in _KitchenFilter.values)
                              ChoiceChip(
                                label: Text(switch (f) {
                                  _KitchenFilter.all => 'All',
                                  _KitchenFilter.deals => 'Deals',
                                  _KitchenFilter.prime => 'Prime',
                                  _KitchenFilter.inStock => 'In stock',
                                }),
                                selected: _filter == f,
                                onSelected: (_) => setState(() => _filter = f),
                              ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        DropdownButtonHideUnderline(
                          child: DropdownButton<_KitchenSort>(
                            value: _sort,
                            items: const [
                              DropdownMenuItem(value: _KitchenSort.featured, child: Text('Featured')),
                              DropdownMenuItem(value: _KitchenSort.priceLow, child: Text('Price: low to high')),
                              DropdownMenuItem(value: _KitchenSort.priceHigh, child: Text('Price: high to low')),
                              DropdownMenuItem(value: _KitchenSort.name, child: Text('Name')),
                              DropdownMenuItem(value: _KitchenSort.rating, child: Text('Rating')),
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
                if (products.isEmpty)
                  const SliverFillRemaining(
                    hasScrollBody: false,
                    child: Center(child: Text('No products in this aisle')),
                  )
                else
                  ProductSliverGrid(
                    products: products,
                    onAdd: _addToCart,
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

/// Full kitchen catalog (all aisles), optional deals-only.
class KitchenProductsScreen extends ConsumerStatefulWidget {
  const KitchenProductsScreen({super.key, this.dealsOnly = false});

  final bool dealsOnly;

  @override
  ConsumerState<KitchenProductsScreen> createState() => _KitchenProductsScreenState();
}

class _KitchenProductsScreenState extends ConsumerState<KitchenProductsScreen> {
  late _KitchenFilter _filter =
      widget.dealsOnly ? _KitchenFilter.deals : _KitchenFilter.all;
  _KitchenSort _sort = _KitchenSort.featured;

  List<Product> _apply(List<Product> products) {
    var list = switch (_filter) {
      _KitchenFilter.all => products,
      _KitchenFilter.deals =>
        products.where((p) => p.originalPrice != null && p.originalPrice! > p.price).toList(),
      _KitchenFilter.prime => products.where((p) => p.prime).toList(),
      _KitchenFilter.inStock => products.where((p) => p.inStock).toList(),
    };
    list = [...list];
    switch (_sort) {
      case _KitchenSort.priceLow:
        list.sort((a, b) => a.price.compareTo(b.price));
      case _KitchenSort.priceHigh:
        list.sort((a, b) => b.price.compareTo(a.price));
      case _KitchenSort.name:
        list.sort((a, b) => a.title.compareTo(b.title));
      case _KitchenSort.rating:
        list.sort((a, b) => b.rating.compareTo(a.rating));
      case _KitchenSort.featured:
        list = sortKitchenWithSaucepansFirst(list);
    }
    return list;
  }

  void _addToCart(Product product) {
    ref.read(cartProvider.notifier).add(product);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${product.title} added'),
        behavior: SnackBarBehavior.floating,
        action: SnackBarAction(label: 'Basket', onPressed: () => context.go('/cart')),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final catalogAsync = ref.watch(kitchenCatalogProvider);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: Text(widget.dealsOnly ? 'Kitchen deals' : 'All kitchen ware'),
        backgroundColor: AppColors.canvas,
        actions: [
          IconButton(
            icon: const Icon(Icons.search_rounded),
            onPressed: () => context.push('/kitchen/search'),
          ),
        ],
      ),
      body: catalogAsync.when(
        loading: () => const LoadingView(message: 'Loading kitchen ware…'),
        error: (e, _) => ErrorView(
          message: e.toString(),
          onRetry: () => ref.read(kitchenCatalogNotifierProvider.notifier).refresh(),
        ),
        data: (raw) {
          final products = _apply(raw);
          return RefreshIndicator(
            onRefresh: () async => ref.read(kitchenCatalogNotifierProvider.notifier).refresh(),
            child: CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${products.length} items',
                          style: const TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          children: [
                            for (final f in _KitchenFilter.values)
                              ChoiceChip(
                                label: Text(switch (f) {
                                  _KitchenFilter.all => 'All',
                                  _KitchenFilter.deals => 'Deals',
                                  _KitchenFilter.prime => 'Prime',
                                  _KitchenFilter.inStock => 'In stock',
                                }),
                                selected: _filter == f,
                                onSelected: (_) => setState(() => _filter = f),
                              ),
                          ],
                        ),
                        DropdownButton<_KitchenSort>(
                          value: _sort,
                          items: const [
                            DropdownMenuItem(value: _KitchenSort.featured, child: Text('Featured')),
                            DropdownMenuItem(value: _KitchenSort.priceLow, child: Text('Price: low to high')),
                            DropdownMenuItem(value: _KitchenSort.priceHigh, child: Text('Price: high to low')),
                            DropdownMenuItem(value: _KitchenSort.name, child: Text('Name')),
                            DropdownMenuItem(value: _KitchenSort.rating, child: Text('Rating')),
                          ],
                          onChanged: (v) {
                            if (v != null) setState(() => _sort = v);
                          },
                        ),
                      ],
                    ),
                  ),
                ),
                if (products.isEmpty)
                  const SliverFillRemaining(
                    hasScrollBody: false,
                    child: Center(child: Text('No kitchen products found')),
                  )
                else
                  ProductSliverGrid(
                    products: products,
                    onAdd: _addToCart,
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}
