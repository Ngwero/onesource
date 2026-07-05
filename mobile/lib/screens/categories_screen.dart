import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../providers/products_provider.dart';
import '../widgets/loading_view.dart';
import '../widgets/product_grid.dart';

class CategoriesScreen extends ConsumerWidget {
  const CategoriesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categoriesAsync = ref.watch(categoriesProvider);
    final productsAsync = ref.watch(productsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Categories')),
      body: categoriesAsync.when(
        loading: () => const LoadingView(message: 'Loading categories…'),
        error: (e, _) => ErrorView(message: e.toString(), onRetry: () => ref.invalidate(categoriesProvider)),
        data: (categories) {
          if (categories.isEmpty) {
            return const Center(child: Text('No categories available'));
          }

          return productsAsync.when(
            loading: () => const LoadingView(),
            error: (e, _) => ErrorView(message: e.toString()),
            data: (allProducts) {
              return RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(categoriesProvider);
                  ref.invalidate(productsProvider);
                },
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    const Text(
                      'Browse fresh produce by aisle',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 16),
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        mainAxisExtent: 100,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                      ),
                      itemCount: categories.length,
                      itemBuilder: (context, index) {
                        final cat = categories[index];
                        return Card(
                          clipBehavior: Clip.antiAlias,
                          child: InkWell(
                            onTap: () => context.push('/category/${cat.id}'),
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [
                                    AppColors.accent.withValues(alpha: 0.12),
                                    AppColors.accentLight,
                                  ],
                                ),
                              ),
                              child: Row(
                                children: [
                                  Text(cat.icon, style: const TextStyle(fontSize: 28)),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      cat.name,
                                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const Icon(Icons.chevron_right, size: 18, color: AppColors.textMuted),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: 24),
                    ...categories.map((cat) {
                      final items = allProducts.where((p) => p.category == cat.id).take(4).toList();
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
