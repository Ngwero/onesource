import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../providers/cart_provider.dart';
import 'account_screen.dart';
import 'cart_screen.dart';
import 'categories_screen.dart';
import 'home_screen.dart';
import 'products_screen.dart';

class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.child, required this.location});

  final Widget child;
  final String location;

  int _indexForLocation(String location) {
    if (location.startsWith('/shop') || location.startsWith('/category') || location.startsWith('/categories')) {
      return 1;
    }
    if (location.startsWith('/cart') || location.startsWith('/checkout')) return 2;
    if (location.startsWith('/account') || location.startsWith('/orders')) return 3;
    return 0;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cartCount = ref.watch(cartItemCountProvider);
    final index = _indexForLocation(location);

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Container(
        decoration: const BoxDecoration(gradient: AppGradients.canvas),
        child: child,
      ),
      extendBody: true,
      bottomNavigationBar: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Container(
          height: 68,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Colors.white,
                Colors.white.withValues(alpha: 0.96),
              ],
            ),
            borderRadius: BorderRadius.circular(34),
            border: Border.all(color: AppColors.border.withValues(alpha: 0.6)),
            boxShadow: [
              BoxShadow(
                color: AppColors.darkGreen.withValues(alpha: 0.12),
                blurRadius: 24,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _NavIcon(
                icon: Icons.home_rounded,
                selected: index == 0,
                onTap: () => context.go('/home'),
              ),
              _NavIcon(
                icon: Icons.storefront_rounded,
                selected: index == 1,
                onTap: () => context.go('/shop'),
              ),
              _NavIcon(
                icon: Icons.shopping_bag_outlined,
                selected: index == 2,
                badge: cartCount > 0 ? cartCount : null,
                onTap: () => context.go('/cart'),
              ),
              _NavIcon(
                icon: Icons.person_outline_rounded,
                selected: index == 3,
                onTap: () => context.go('/account'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavIcon extends StatelessWidget {
  const _NavIcon({
    required this.icon,
    required this.selected,
    required this.onTap,
    this.badge,
  });

  final IconData icon;
  final bool selected;
  final VoidCallback onTap;
  final int? badge;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 56,
        height: 56,
        child: Center(
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: selected ? 48 : 40,
            height: selected ? 48 : 40,
            decoration: BoxDecoration(
              gradient: selected ? AppGradients.navSelected : null,
              color: selected ? null : Colors.transparent,
              shape: BoxShape.circle,
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                Icon(
                  icon,
                  color: selected ? Colors.white : AppColors.textMuted,
                  size: 24,
                ),
                if (badge != null)
                  Positioned(
                    top: 6,
                    right: 6,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(color: AppColors.deal, shape: BoxShape.circle),
                      constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                      child: Text(
                        '$badge',
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w800),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class TabHomeScreen extends StatelessWidget {
  const TabHomeScreen({super.key});
  @override
  Widget build(BuildContext context) => const SafeArea(child: HomeScreen());
}

class TabCategoriesScreen extends StatelessWidget {
  const TabCategoriesScreen({super.key});
  @override
  Widget build(BuildContext context) => const SafeArea(child: CategoriesScreen());
}

class TabShopScreen extends ConsumerWidget {
  const TabShopScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final deals = GoRouterState.of(context).uri.queryParameters['deals'] == '1';
    return SafeArea(child: ProductsScreen(dealsOnly: deals));
  }
}

class TabCartScreen extends StatelessWidget {
  const TabCartScreen({super.key});
  @override
  Widget build(BuildContext context) => const SafeArea(child: CartScreen());
}

class TabAccountScreen extends StatelessWidget {
  const TabAccountScreen({super.key});
  @override
  Widget build(BuildContext context) => const SafeArea(child: AccountScreen());
}
