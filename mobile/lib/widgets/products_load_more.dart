import 'package:flutter/material.dart';

import '../config/theme.dart';

/// Footer shown while loading the next page of products.
class ProductsLoadMoreSliver extends StatelessWidget {
  const ProductsLoadMoreSliver({
    super.key,
    required this.isLoadingMore,
    required this.hasMore,
    this.itemCount = 0,
    this.total = 0,
  });

  final bool isLoadingMore;
  final bool hasMore;
  final int itemCount;
  final int total;

  @override
  Widget build(BuildContext context) {
    if (isLoadingMore) {
      return const SliverToBoxAdapter(
        child: Padding(
          padding: EdgeInsets.symmetric(vertical: 24),
          child: Center(
            child: SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(strokeWidth: 2.5, color: AppColors.darkGreen),
            ),
          ),
        ),
      );
    }

    if (!hasMore && itemCount > 0) {
      return SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
          child: Text(
            total > 0 ? 'Showing all $total products' : 'End of list',
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
          ),
        ),
      );
    }

    return const SliverToBoxAdapter(child: SizedBox(height: 100));
  }
}

/// Triggers [onLoadMore] when the user scrolls near the bottom.
class InfiniteScrollListener {
  InfiniteScrollListener({
    required this.controller,
    required this.onLoadMore,
    this.threshold = 360,
  }) {
    controller.addListener(_onScroll);
  }

  final ScrollController controller;
  final VoidCallback onLoadMore;
  final double threshold;

  void _onScroll() {
    if (!controller.hasClients) return;
    final position = controller.position;
    if (position.pixels >= position.maxScrollExtent - threshold) {
      onLoadMore();
    }
  }

  void dispose() {
    controller.removeListener(_onScroll);
  }
}
