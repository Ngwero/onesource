import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../providers/user_lists_provider.dart';
import '../services/feature_flags.dart';
import '../widgets/product_thumbnail.dart';

/// Server-aware wishlist screen (FEATURE_WISHLISTS). Uses local saved list as the source of truth UI.
class WishlistScreen extends ConsumerWidget {
  const WishlistScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = context.tr;
    final flags = FeatureFlags.current;
    if (!flags.enabled('wishlists')) {
      // Fall through to classic saved items when flag is off.
      return const SizedBox.shrink();
    }

    final items = ref.watch(savedItemsProvider);
    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: Text(s.get('accountMenu.savedItems')),
        backgroundColor: AppColors.canvas,
      ),
      body: items.isEmpty
          ? Center(child: Text(s.get('lists.empty')))
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final p = items[index];
                return ListTile(
                  tileColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  leading: ProductThumbnail(image: p.image, size: 52),
                  title: Text(p.title, maxLines: 2, overflow: TextOverflow.ellipsis),
                  onTap: () => context.push('/product/${p.id}'),
                );
              },
            ),
    );
  }
}
