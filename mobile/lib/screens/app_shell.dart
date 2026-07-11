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
    if (location.startsWith('/shop') || location.startsWith('/category')) return 1;
    if (location.startsWith('/categories')) return 2;
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
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(top: 8),
        child: FloatingActionButton(
          onPressed: () => context.go('/cart'),
          elevation: 6,
          backgroundColor: AppColors.darkGreen,
          shape: const CircleBorder(),
          child: Badge(
            isLabelVisible: cartCount > 0,
            label: Text('$cartCount'),
            backgroundColor: AppColors.amber,
            child: const Icon(Icons.shopping_bag_outlined, color: Colors.white, size: 26),
          ),
        ),
      ),
      bottomNavigationBar: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 18),
        child: Container(
          height: 72,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: AppColors.border.withValues(alpha: 0.5)),
            boxShadow: [
              BoxShadow(
                color: AppColors.darkGreen.withValues(alpha: 0.1),
                blurRadius: 24,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _NavItem(
                icon: Icons.home_rounded,
                label: 'Home',
                selected: index == 0,
                onTap: () => context.go('/home'),
              ),
              _NavItem(
                icon: Icons.storefront_rounded,
                label: 'Shop',
                selected: index == 1,
                onTap: () => context.go('/shop'),
              ),
              const SizedBox(width: 56),
              _NavItem(
                icon: Icons.grid_view_rounded,
                label: 'Categories',
                selected: index == 2,
                onTap: () => context.go('/categories'),
              ),
              _NavItem(
                icon: Icons.person_outline_rounded,
                label: 'Account',
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

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = selected ? AppColors.darkGreen : AppColors.textMuted;

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 64,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class TabHomeScreen extends StatelessWidget {
  const TabHomeScreen({super.key});
  @override
  Widget build(BuildContext context) => const HomeScreen();
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
