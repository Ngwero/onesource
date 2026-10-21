import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../i18n/app_strings.dart';
import '../providers/category_availability_provider.dart';
import '../providers/products_provider.dart';
import '../services/api_client.dart';
import 'loading_view.dart';

/// Shared loading, retry and refresh behavior for mobile category lists.
class AvailableCategories extends ConsumerWidget {
  const AvailableCategories(
      {super.key, required this.shop, required this.builder});

  final String shop;
  final Widget Function(Map<String, ProductsPageResult>) builder;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = categoryAvailabilityProvider(shop);
    Future<void> refresh() async {
      if (shop == 'fresh') ref.invalidate(categoriesProvider);
      ref.invalidate(provider);
      await ref.read(provider.future);
    }

    return ref.watch(provider).when(
          loading: () => LoadingView(message: context.tr.get('common.loading')),
          error: (error, _) => ErrorView(message: error, onRetry: refresh),
          data: (pages) => RefreshIndicator(
            onRefresh: refresh,
            child: pages.isEmpty
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(32),
                        child: Text(context.tr.get('app.products.none'),
                            textAlign: TextAlign.center),
                      ),
                    ],
                  )
                : builder(pages),
          ),
        );
  }
}
