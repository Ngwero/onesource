import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../data/kitchen_ware.dart';
import '../providers/products_provider.dart';
import '../utils/kitchen_mode.dart';
import '../utils/responsive.dart';
import '../widgets/loading_view.dart';
import '../widgets/product_grid.dart';
import '../widgets/shop_mode_switch.dart';

class CategoriesScreen extends ConsumerWidget {
  const CategoriesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categoriesAsync = ref.watch(categoriesProvider);
    final productsAsync = ref.watch(productsProvider);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: const Text('Categories'),
        backgroundColor: AppColors.canvas,
      ),
      body: categoriesAsync.when(
        loading: () => const LoadingView(message: 'Loading categories…'),
        error: (e, _) => ErrorView(message: e.toString(), onRetry: () => ref.invalidate(categoriesProvider)),
        data: (categories) {
          final produceCategories = categories
              .where((c) => c.id != kitchenWareCategoryId && c.id != 'kitchen-furniture')
              .toList();
          if (produceCategories.isEmpty) {
            return const Center(child: Text('No categories available'));
          }

          return productsAsync.when(
            loading: () => const LoadingView(),
            error: (e, _) => ErrorView(message: e.toString()),
            data: (allProducts) {
              final produceProducts = excludeKitchenProducts(allProducts);
              final bottomPad = shellBottomPadding(context);
              final catCols = categoryGridCount(context);
              return RefreshIndicator(
                color: AppColors.darkGreen,
                onRefresh: () async {
                  ref.invalidate(categoriesProvider);
                  ref.invalidate(productsProvider);
                },
                child: ListView(
                  padding: EdgeInsets.fromLTRB(16, 8, 16, bottomPad),
                  children: [
                    const ShopModeSwitch(kitchenMode: false),
                    const SizedBox(height: 16),
                    Material(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      clipBehavior: Clip.antiAlias,
                      child: InkWell(
                        onTap: () => context.go('/kitchen'),
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                AppColors.darkGreen.withValues(alpha: 0.1),
                                AppColors.lemonGreen.withValues(alpha: 0.22),
                              ],
                            ),
                          ),
                          child: const Row(
                            children: [
                              Text('🍳', style: TextStyle(fontSize: 28)),
                              SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Kitchen Ware',
                                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                                    ),
                                    SizedBox(height: 2),
                                    Text(
                                      'Pots, pans, tabletop & more',
                                      style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                                    ),
                                  ],
                                ),
                              ),
                              Icon(Icons.chevron_right, color: AppColors.textMuted),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'Browse fresh produce by aisle',
                      style: TextStyle(
                        fontFamily: 'Gabarito',
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 14),
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: catCols,
                        mainAxisExtent: 96,
                        crossAxisSpacing: 10,
                        mainAxisSpacing: 10,
                      ),
                      itemCount: produceCategories.length,
                      itemBuilder: (context, index) {
                        final cat = produceCategories[index];
                        return Material(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          clipBehavior: Clip.antiAlias,
                          child: InkWell(
                            onTap: () => context.push('/category/${cat.id}'),
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Row(
                                children: [
                                  Text(cat.icon, style: const TextStyle(fontSize: 26)),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      cat.name,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 14,
                                        letterSpacing: -0.2,
                                      ),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: 24),
                    ...produceCategories.map((cat) {
                      final items =
                          produceProducts.where((p) => p.category == cat.id).take(4).toList();
                      if (items.isEmpty) return const SizedBox.shrink();
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(cat.icon, style: const TextStyle(fontSize: 20)),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    cat.name,
                                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
                                  ),
                                ),
                                TextButton(
                                  onPressed: () => context.push('/category/${cat.id}'),
                                  child: const Text('See all'),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            ProductGrid(products: items),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}
