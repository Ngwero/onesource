import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../models/product.dart';
import '../providers/user_lists_provider.dart';
import '../utils/cart_feedback.dart';
import '../utils/responsive.dart';
import '../widgets/popular_product_card.dart';
import '../widgets/product_grid.dart';

class SavedItemsScreen extends ConsumerWidget {
  const SavedItemsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = context.tr;
    final items = ref.watch(savedItemsProvider);
    return _ProductListPage(
      title: s.get('accountMenu.savedItems'),
      subtitle: s.get('lists.subtitle'),
      emptyText: s.get('lists.empty'),
      emptyIcon: Icons.favorite_border_rounded,
      products: items,
      onRemove: (p) => ref.read(savedItemsProvider.notifier).remove(p.id),
      removeLabel: s.get('common.remove'),
    );
  }
}

class BrowsingHistoryScreen extends ConsumerWidget {
  const BrowsingHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = context.tr;
    final items = ref.watch(browsingHistoryProvider);
    return _ProductListPage(
      title: s.get('accountMenu.browsingHistory'),
      subtitle: s.get('history.subtitle'),
      emptyText: s.get('history.empty'),
      emptyIcon: Icons.history_rounded,
      products: items,
      onRemove: (p) => ref.read(browsingHistoryProvider.notifier).remove(p.id),
      removeLabel: s.get('common.remove'),
      onClear: items.isEmpty
          ? null
          : () => ref.read(browsingHistoryProvider.notifier).clear(),
      clearLabel: s.get('app.history.clear'),
    );
  }
}

class _ProductListPage extends ConsumerWidget {
  const _ProductListPage({
    required this.title,
    required this.subtitle,
    required this.emptyText,
    required this.emptyIcon,
    required this.products,
    required this.onRemove,
    required this.removeLabel,
    this.onClear,
    this.clearLabel,
  });

  final String title;
  final String subtitle;
  final String emptyText;
  final IconData emptyIcon;
  final List<Product> products;
  final void Function(Product) onRemove;
  final String removeLabel;
  final VoidCallback? onClear;
  final String? clearLabel;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = context.tr;
    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: Text(title),
        backgroundColor: AppColors.canvas,
        actions: [
          if (onClear != null)
            TextButton(onPressed: onClear, child: Text(clearLabel ?? '')),
        ],
      ),
      body: products.isEmpty
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(emptyIcon, size: 52, color: AppColors.textMuted),
                    const SizedBox(height: 14),
                    Text(
                      emptyText,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AppColors.textMuted, height: 1.4),
                    ),
                    const SizedBox(height: 18),
                    FilledButton(
                      onPressed: () => context.go('/shop'),
                      child: Text(s.get('common.browseAll')),
                    ),
                  ],
                ),
              ),
            )
          : CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                    child: Text(
                      subtitle,
                      style: const TextStyle(color: AppColors.textMuted),
                    ),
                  ),
                ),
                SliverPadding(
                  padding: EdgeInsets.fromLTRB(16, 0, 16, shellBottomPadding(context)),
                  sliver: SliverGrid(
                    gridDelegate: ProductGrid.popularGridDelegateFor(context),
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final product = products[index];
                        return Stack(
                          children: [
                            Positioned.fill(
                              child: PopularProductCard(
                                product: product,
                                onAdd: () => addToCartWithFeedback(context, ref, product),
                              ),
                            ),
                            Positioned(
                              top: 6,
                              right: 6,
                              child: Material(
                                color: Colors.white,
                                shape: const CircleBorder(),
                                elevation: 1,
                                child: IconButton(
                                  tooltip: removeLabel,
                                  visualDensity: VisualDensity.compact,
                                  icon: const Icon(Icons.close_rounded, size: 18),
                                  onPressed: () => onRemove(product),
                                ),
                              ),
                            ),
                          ],
                        );
                      },
                      childCount: products.length,
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
