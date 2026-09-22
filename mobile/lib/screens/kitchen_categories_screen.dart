import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../data/kitchen_ware.dart';
import '../providers/kitchen_catalog_provider.dart';
import '../utils/kitchen_mode.dart';
import '../utils/responsive.dart';
import '../widgets/loading_view.dart';
import '../widgets/product_grid.dart';
import '../widgets/shop_mode_switch.dart';

class KitchenCategoriesScreen extends ConsumerWidget {
  const KitchenCategoriesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final catalogAsync = ref.watch(kitchenCatalogProvider);
    final catalogState = ref.watch(kitchenCatalogNotifierProvider);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: const Text('Kitchen aisles'),
        backgroundColor: AppColors.canvas,
      ),
      body: catalogAsync.when(
        loading: () => const LoadingView(message: 'Loading kitchen aisles…'),
        error: (e, _) => ErrorView(
          message: e.toString(),
          onRetry: () => ref.read(kitchenCatalogNotifierProvider.notifier).refresh(),
        ),
        data: (products) {
          final groups = groupKitchenByAisle(products);
          final counts = {
            for (final g in groups) g.aisle.id: g.products.length,
          };

          return RefreshIndicator(
            onRefresh: () async =>
                ref.read(kitchenCatalogNotifierProvider.notifier).refresh(),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
              children: [
                const ShopModeSwitch(kitchenMode: true),
                const SizedBox(height: 16),
                const Text(
                  'Browse cookware by aisle',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 16),
                // Always list every subcategory — same pattern as Fresh categories.
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: categoryGridCount(context),
                    mainAxisExtent: 108,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                  ),
                  itemCount: kitchenWareAisles.length,
                  itemBuilder: (context, index) {
                    final aisle = kitchenWareAisles[index];
                    final accent = Color(aisle.accentArgb);
                    final count = counts[aisle.id] ?? 0;
                    return Card(
                      clipBehavior: Clip.antiAlias,
                      child: InkWell(
                        onTap: () => context.push(kitchenAislePath(aisle.id)),
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                accent.withValues(alpha: 0.16),
                                AppColors.surface,
                              ],
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(aisle.icon, style: const TextStyle(fontSize: 26)),
                                  const Spacer(),
                                  Text(
                                    catalogState.isLoadingMore && count == 0
                                        ? '…'
                                        : '$count',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                      color: accent,
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                              const Spacer(),
                              Text(
                                aisle.title,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14,
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
                ...groups.map((group) {
                  final items = group.products.take(4).toList();
                  if (items.isEmpty) return const SizedBox.shrink();
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(group.aisle.icon, style: const TextStyle(fontSize: 20)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                group.aisle.title,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 17,
                                ),
                              ),
                            ),
                            TextButton(
                              onPressed: () =>
                                  context.push(kitchenAislePath(group.aisle.id)),
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
      ),
    );
  }
}
