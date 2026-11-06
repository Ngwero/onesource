import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../i18n/app_strings.dart';
import '../models/product.dart';
import '../providers/user_lists_provider.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../utils/shop_mode.dart';
import 'product_recommendation_row.dart';

/// Recently viewed (local history) + buy-it-again (API) for a shop home.
/// Recently viewed is scoped to [shop] so Fresh never mixes Kitchen SKUs, etc.
class HomeDiscoveryRows extends ConsumerStatefulWidget {
  const HomeDiscoveryRows({
    super.key,
    required this.onAdd,
    this.shop = ShopMode.fresh,
    this.showBuyItAgain = true,
  });

  final void Function(Product product) onAdd;
  final ShopMode shop;
  final bool showBuyItAgain;

  @override
  ConsumerState<HomeDiscoveryRows> createState() => _HomeDiscoveryRowsState();
}

class _HomeDiscoveryRowsState extends ConsumerState<HomeDiscoveryRows> {
  List<Product> _buyAgain = [];
  bool _loadedBuyAgain = false;

  @override
  void initState() {
    super.initState();
    if (widget.showBuyItAgain) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _loadBuyAgain());
    } else {
      _loadedBuyAgain = true;
    }
  }

  Future<void> _loadBuyAgain() async {
    final session = ref.read(authStateProvider).valueOrNull?.session;
    if (session == null) {
      if (mounted) setState(() => _loadedBuyAgain = true);
      return;
    }
    final products = await apiClientProvider.fetchBuyAgain();
    if (!mounted) return;
    setState(() {
      _buyAgain = products
          .where((p) => shopModeForProduct(p) == widget.shop)
          .toList();
      _loadedBuyAgain = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    final s = context.tr;
    final recent = ref
        .watch(browsingHistoryProvider)
        .where((p) => shopModeForProduct(p) == widget.shop)
        .toList();
    final session = ref.watch(authStateProvider).valueOrNull?.session;

    if (widget.showBuyItAgain && session != null && !_loadedBuyAgain) {
      // Kick a reload when the user signs in after mount.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && !_loadedBuyAgain) _loadBuyAgain();
      });
    }

    return Column(
      children: [
        if (widget.showBuyItAgain && _buyAgain.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 22),
            child: ProductRecommendationRow(
              title: s.get('home.buyItAgain'),
              products: _buyAgain,
              onAdd: widget.onAdd,
              viewAllLabel: s.get('common.seeAll'),
              onViewAll: () => context.push('/account'),
            ),
          ),
        if (recent.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 22),
            child: ProductRecommendationRow(
              title: s.get('home.recentlyViewed'),
              products: recent.take(16).toList(),
              onAdd: widget.onAdd,
              viewAllLabel: s.get('common.seeAll'),
              onViewAll: () => context.push('/history'),
            ),
          ),
      ],
    );
  }
}
