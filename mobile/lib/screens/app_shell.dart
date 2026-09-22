import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../providers/cart_provider.dart';
import '../utils/kitchen_mode.dart';
import '../utils/responsive.dart';
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
    if (location.startsWith('/cart')) return 4;
    if (location.startsWith('/kitchen/shop') ||
        location.startsWith('/kitchen/aisle') ||
        location.startsWith('/shop') ||
        location.startsWith('/category')) {
      return 1;
    }
    if (location.startsWith('/kitchen/categories') ||
        location.startsWith('/categories')) {
      return 2;
    }
    if (location.startsWith('/account') || location.startsWith('/orders')) {
      return 3;
    }
    return 0;
  }

  void _goHome(BuildContext context, bool kitchen) {
    context.go(kitchen ? '/kitchen' : '/home');
  }

  void _goShop(BuildContext context, bool kitchen) {
    context.go(kitchen ? '/kitchen/shop' : '/shop');
  }

  void _goCategories(BuildContext context, bool kitchen) {
    context.go(kitchen ? '/kitchen/categories' : '/categories');
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cartCount = ref.watch(cartItemCountProvider);
    final index = _indexForLocation(location);
    final kitchen = isKitchenPath(location);
    final wide = isWideLayout(context);
    final bottomInset = MediaQuery.viewPaddingOf(context).bottom;

    final pageBody = AnimatedSwitcher(
      duration: const Duration(milliseconds: 280),
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeInCubic,
      transitionBuilder: (child, animation) {
        final slide = Tween<Offset>(
          begin: const Offset(0.02, 0.012),
          end: Offset.zero,
        ).animate(animation);
        return FadeTransition(
          opacity: animation,
          child: SlideTransition(position: slide, child: child),
        );
      },
      child: KeyedSubtree(
        key: ValueKey(location.split('?').first),
        child: child,
      ),
    );

    if (wide) {
      final railIndex = index.clamp(0, 4);
      return Scaffold(
        backgroundColor: AppColors.canvas,
        body: Row(
          children: [
            NavigationRail(
              selectedIndex: railIndex,
              onDestinationSelected: (i) {
                switch (i) {
                  case 0:
                    _goHome(context, kitchen);
                  case 1:
                    _goShop(context, kitchen);
                  case 2:
                    _goCategories(context, kitchen);
                  case 3:
                    context.go('/account');
                  case 4:
                    context.go('/cart');
                }
              },
              backgroundColor: Colors.white,
              indicatorColor: AppColors.lemonGreen.withValues(alpha: 0.45),
              selectedIconTheme: const IconThemeData(color: AppColors.darkGreen),
              unselectedIconTheme: const IconThemeData(color: AppColors.textMuted),
              selectedLabelTextStyle: const TextStyle(
                color: AppColors.darkGreen,
                fontWeight: FontWeight.w700,
                fontSize: 12,
              ),
              unselectedLabelTextStyle: const TextStyle(
                color: AppColors.textMuted,
                fontWeight: FontWeight.w500,
                fontSize: 12,
              ),
              labelType: NavigationRailLabelType.all,
              minWidth: 88,
              destinations: [
                const NavigationRailDestination(
                  icon: Icon(Icons.home_outlined),
                  selectedIcon: Icon(Icons.home_rounded),
                  label: Text('Home'),
                ),
                const NavigationRailDestination(
                  icon: Icon(Icons.storefront_outlined),
                  selectedIcon: Icon(Icons.storefront_rounded),
                  label: Text('Shop'),
                ),
                const NavigationRailDestination(
                  icon: Icon(Icons.grid_view_outlined),
                  selectedIcon: Icon(Icons.grid_view_rounded),
                  label: Text('Categories'),
                ),
                const NavigationRailDestination(
                  icon: Icon(Icons.person_outline_rounded),
                  selectedIcon: Icon(Icons.person_rounded),
                  label: Text('Account'),
                ),
                NavigationRailDestination(
                  icon: Badge(
                    isLabelVisible: cartCount > 0,
                    label: Text('$cartCount'),
                    backgroundColor: AppColors.amber,
                    child: const Icon(Icons.shopping_bag_outlined),
                  ),
                  selectedIcon: Badge(
                    isLabelVisible: cartCount > 0,
                    label: Text('$cartCount'),
                    backgroundColor: AppColors.amber,
                    child: const Icon(Icons.shopping_bag_rounded),
                  ),
                  label: const Text('Cart'),
                ),
              ],
            ),
            const VerticalDivider(width: 1, thickness: 1, color: AppColors.border),
            Expanded(
              child: ContentWidth(child: pageBody),
            ),
          ],
        ),
      );
    }

    // Phone: bottom bar + docked cart FAB
    final phoneNavIndex = index == 4 ? -1 : index;
    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: pageBody,
      extendBody: true,
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      floatingActionButton: location.startsWith('/cart')
          ? null
          : _CartFab(
              cartCount: cartCount,
              onPressed: () => context.go('/cart'),
            ),
      bottomNavigationBar: Padding(
        padding: EdgeInsets.fromLTRB(16, 0, 16, bottomInset + 12),
        child: TweenAnimationBuilder<double>(
          tween: Tween(begin: 0.92, end: 1),
          duration: const Duration(milliseconds: 420),
          curve: Curves.easeOutBack,
          builder: (context, value, child) {
            return Transform.scale(
              scale: value,
              alignment: Alignment.bottomCenter,
              child: Opacity(
                opacity: value.clamp(0.0, 1.0),
                child: child,
              ),
            );
          },
          child: Container(
            height: 72,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(28),
              border: Border.all(color: AppColors.border.withValues(alpha: 0.5)),
              boxShadow: [
                BoxShadow(
                  color: AppColors.darkGreen.withValues(alpha: 0.12),
                  blurRadius: 22,
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
                  selected: phoneNavIndex == 0,
                  onTap: () => _goHome(context, kitchen),
                ),
                _NavItem(
                  icon: Icons.storefront_rounded,
                  label: 'Shop',
                  selected: phoneNavIndex == 1,
                  onTap: () => _goShop(context, kitchen),
                ),
                if (!location.startsWith('/cart')) const SizedBox(width: 56),
                if (location.startsWith('/cart'))
                  _NavItem(
                    icon: Icons.shopping_bag_rounded,
                    label: 'Cart',
                    selected: true,
                    onTap: () => context.go('/cart'),
                  ),
                _NavItem(
                  icon: Icons.grid_view_rounded,
                  label: 'Categories',
                  selected: phoneNavIndex == 2,
                  onTap: () => _goCategories(context, kitchen),
                ),
                _NavItem(
                  icon: Icons.person_outline_rounded,
                  label: 'Account',
                  selected: phoneNavIndex == 3,
                  onTap: () => context.go('/account'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CartFab extends StatefulWidget {
  const _CartFab({required this.cartCount, required this.onPressed});

  final int cartCount;
  final VoidCallback onPressed;

  @override
  State<_CartFab> createState() => _CartFabState();
}

class _CartFabState extends State<_CartFab>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 220));
  int _lastCount = 0;

  @override
  void initState() {
    super.initState();
    _lastCount = widget.cartCount;
  }

  @override
  void didUpdateWidget(covariant _CartFab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.cartCount != _lastCount) {
      _lastCount = widget.cartCount;
      _pulse.forward(from: 0).then((_) {
        if (mounted) _pulse.reverse();
      });
    }
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: Tween<double>(begin: 1, end: 1.12).animate(
        CurvedAnimation(parent: _pulse, curve: Curves.easeOutBack),
      ),
      child: FloatingActionButton(
        onPressed: widget.onPressed,
        elevation: 6,
        backgroundColor: AppColors.darkGreen,
        shape: const CircleBorder(),
        child: Badge(
          isLabelVisible: widget.cartCount > 0,
          label: Text('${widget.cartCount}'),
          backgroundColor: AppColors.amber,
          child: const Icon(
            Icons.shopping_bag_outlined,
            color: Colors.white,
            size: 26,
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatefulWidget {
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
  State<_NavItem> createState() => _NavItemState();
}

class _NavItemState extends State<_NavItem> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final selected = widget.selected;
    final color = selected ? AppColors.darkGreen : AppColors.textMuted;

    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapCancel: () => setState(() => _pressed = false),
      onTapUp: (_) => setState(() => _pressed = false),
      onTap: widget.onTap,
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 64,
        child: AnimatedScale(
          scale: _pressed ? 0.9 : 1,
          duration: const Duration(milliseconds: 120),
          curve: Curves.easeOut,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 240),
                curve: Curves.easeOutCubic,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: selected
                      ? AppColors.lemonGreen.withValues(alpha: 0.35)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: AnimatedScale(
                  scale: selected ? 1.08 : 1,
                  duration: const Duration(milliseconds: 240),
                  curve: Curves.easeOutBack,
                  child: Icon(widget.icon, color: color, size: 24),
                ),
              ),
              const SizedBox(height: 2),
              AnimatedDefaultTextStyle(
                duration: const Duration(milliseconds: 220),
                curve: Curves.easeOut,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                  color: color,
                ),
                child: Text(widget.label),
              ),
            ],
          ),
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
  Widget build(BuildContext context) =>
      const SafeArea(child: CategoriesScreen());
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
