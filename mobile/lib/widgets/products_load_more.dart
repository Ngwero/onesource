import 'package:flutter/material.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../utils/responsive.dart';
import 'brand_loader.dart';

/// Footer for endless product lists: a spinner while more pages exist, an
/// inline retry row when the next page failed, and an end-of-list message.
class ProductsLoadMoreSliver extends StatelessWidget {
  const ProductsLoadMoreSliver({
    super.key,
    required this.isLoadingMore,
    required this.hasMore,
    this.itemCount = 0,
    this.total = 0,
    this.error,
    this.onRetry,
  });

  final bool isLoadingMore;
  final bool hasMore;

  /// Products shown in the list (used for the "seen all" message).
  final int itemCount;
  final int total;

  /// Error from the last next-page request; shows a retry row instead of the spinner.
  final Object? error;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final bottom = shellBottomPadding(context);
    final s = context.tr;

    if (error != null && !isLoadingMore) {
      return SliverToBoxAdapter(
        child: Padding(
          padding: EdgeInsets.fromLTRB(20, 16, 20, bottom),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                s.get('app.common.loadMoreFailed'),
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
              ),
              if (onRetry != null)
                TextButton.icon(
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh_rounded, size: 18),
                  label: Text(s.get('common.retry')),
                  style: TextButton.styleFrom(foregroundColor: AppColors.darkGreen),
                ),
            ],
          ),
        ),
      );
    }

    if (isLoadingMore || (hasMore && itemCount > 0)) {
      return SliverToBoxAdapter(
        child: Padding(
          padding: EdgeInsets.fromLTRB(0, 24, 0, bottom),
          child: const Center(child: BrandLoader(size: 36)),
        ),
      );
    }

    if (!hasMore && itemCount > 0) {
      return SliverToBoxAdapter(
        child: Padding(
          padding: EdgeInsets.fromLTRB(20, 16, 20, bottom),
          child: Text(
            s.t('app.common.seenAll', {'count': itemCount}),
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
          ),
        ),
      );
    }

    return SliverToBoxAdapter(child: SizedBox(height: bottom));
  }
}

/// Calls [onLoadMore] when the user scrolls within [threshold] of the bottom,
/// and — via [scheduleCheck] — when a page left the list too short to scroll.
///
/// [onLoadMore] must be idempotent (the paginated notifier ignores calls while
/// loading, at the end, or after an error).
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

  bool _checkScheduled = false;
  bool _disposed = false;

  bool get _nearBottom {
    if (!controller.hasClients) return false;
    final position = controller.position;
    if (!position.hasContentDimensions) return false;
    return position.pixels >= position.maxScrollExtent - threshold;
  }

  void _onScroll() {
    if (_nearBottom) onLoadMore();
  }

  /// After the next frame, loads another page if the content doesn't fill the
  /// viewport or the user is already near the bottom. Call from `build`.
  void scheduleCheck() {
    if (_checkScheduled || _disposed) return;
    _checkScheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkScheduled = false;
      if (!_disposed && _nearBottom) onLoadMore();
    });
  }

  void dispose() {
    _disposed = true;
    controller.removeListener(_onScroll);
  }
}
