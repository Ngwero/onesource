import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../providers/currency_provider.dart';
import '../models/order.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../utils/responsive.dart';
import '../utils/user_facing_error.dart';
import '../widgets/brand_logo.dart';
import '../widgets/order_progress.dart';

import '../widgets/locale_currency_bar.dart';

class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final profileAsync = ref.watch(profileProvider);
    final user = auth.value?.session?.user;

    final s = context.tr;
    if (user == null) {
      return Scaffold(
        backgroundColor: AppColors.canvas,
        appBar: AppBar(
          title: Text(s.get('common.account')),
          backgroundColor: AppColors.canvas,
        ),
        body: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) => SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(24, 24, 24, 24 + shellBottomPadding(context)),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  minHeight: constraints.maxHeight - 48 - shellBottomPadding(context),
                ),
                child: IntrinsicHeight(
                  child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Spacer(),
                const Center(child: BrandLogoMark(size: 72, showWordmark: true)),
                const SizedBox(height: 28),
                Text(
                  s.get('app.account.guestTitle'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                Text(
                  s.get('accountMenu.signInPrompt'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.textMuted, height: 1.45),
                ),
                const SizedBox(height: 28),
                ElevatedButton(onPressed: () => context.push('/login'), child: Text(s.get('auth.signIn'))),
                const SizedBox(height: 10),
                OutlinedButton(onPressed: () => context.push('/signup'), child: Text(s.get('auth.signUp'))),
                const SizedBox(height: 18),
                const Card(
                  child: Padding(padding: EdgeInsets.all(16), child: LocaleCurrencyBar()),
                ),
                const SizedBox(height: 12),
                Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    ActionChip(
                      avatar: const Icon(Icons.favorite_border_rounded, size: 18),
                      label: Text(s.get('accountMenu.savedItems')),
                      onPressed: () => context.go('/lists'),
                    ),
                    ActionChip(
                      avatar: const Icon(Icons.history_rounded, size: 18),
                      label: Text(s.get('accountMenu.browsingHistory')),
                      onPressed: () => context.go('/history'),
                    ),
                    ActionChip(
                      avatar: const Icon(Icons.flight_takeoff_rounded, size: 18),
                      label: Text(s.get('nav.exports')),
                      onPressed: () => context.push('/exports'),
                    ),
                  ],
                ),
                const Spacer(flex: 2),
                TextButton(
                  onPressed: () => context.push('/privacy'),
                  child: Text(s.get('app.privacy.title')),
                ),
                TextButton(
                  onPressed: () => context.go('/home'),
                  child: Text(s.get('app.account.continueBrowsing')),
                ),
              ],
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }

    final name = profileAsync.value?.fullName ?? user.email ?? s.get('app.account.customer');
    final initials = name.isNotEmpty ? name.substring(0, 1).toUpperCase() : '?';
    final strings = ref.watch(stringsProvider);
    final bottomPad = shellBottomPadding(context);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: Text(s.get('accountPage.title')),
        backgroundColor: AppColors.canvas,
      ),
      body: ListView(
        padding: EdgeInsets.fromLTRB(16, 8, 16, bottomPad),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: AppColors.accent,
                    child: Text(initials, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800)),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          s.t('accountMenu.helloUser', {'name': name}),
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 4),
                        Text(user.email ?? '', style: const TextStyle(color: AppColors.textMuted)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          Text(strings.preferences, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.textMuted)),
          const SizedBox(height: 8),
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: LocaleCurrencyBar(),
            ),
          ),
          const SizedBox(height: 20),
          _SectionLabel(s.get('accountPage.sections.activity.title')),
          _HubGrid(children: [
            _HubCard(
              icon: Icons.receipt_long,
              label: s.get('accountPage.cards.orders.title'),
              onTap: () => context.push('/orders'),
            ),
            _HubCard(
              icon: Icons.favorite_border_rounded,
              label: s.get('accountMenu.savedItems'),
              onTap: () => context.go('/lists'),
            ),
            _HubCard(
              icon: Icons.history_rounded,
              label: s.get('accountMenu.browsingHistory'),
              onTap: () => context.go('/history'),
            ),
            _HubCard(
              icon: Icons.shopping_cart_outlined,
              label: s.get('accountPage.cards.basket.title'),
              onTap: () => context.go('/cart'),
            ),
          ]),
          const SizedBox(height: 20),
          _SectionLabel(s.get('accountPage.sections.shop.title')),
          _HubGrid(children: [
            _HubCard(icon: Icons.eco_outlined, label: s.get('header.shopFresh'), onTap: () => context.go('/home')),
            _HubCard(icon: Icons.kitchen_outlined, label: s.get('header.shopKitchen'), onTap: () => context.go('/kitchen')),
            _HubCard(icon: Icons.spa_outlined, label: s.get('header.shopCosmetics'), onTap: () => context.go('/cosmetics')),
            _HubCard(icon: Icons.flight_takeoff_rounded, label: s.get('nav.exports'), onTap: () => context.push('/exports')),
            _HubCard(icon: Icons.grid_view_rounded, label: s.get('accountPage.sections.shop.links.categories'), onTap: () => context.go('/categories')),
            _HubCard(icon: Icons.search, label: s.get('common.search'), onTap: () => context.push('/search')),
          ]),
          const SizedBox(height: 20),
          _SectionLabel(s.get('accountPage.sections.account.title')),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.lock_reset_rounded, color: AppColors.accent),
                  title: Text(s.get('accountPage.cards.security.title')),
                  subtitle: Text(s.get('accountPage.cards.security.description')),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => context.push('/change-password'),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.notifications_none_rounded, color: AppColors.accent),
                  title: Text(s.get('app.notifications.title')),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => context.push('/notifications'),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.privacy_tip_outlined, color: AppColors.accent),
                  title: Text(s.get('app.privacy.title')),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => context.push('/privacy'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          OutlinedButton(
            onPressed: () async {
              await ref.read(authServiceProvider).signOut();
              if (context.mounted) context.go('/home');
            },
            child: Text(s.get('auth.signOut')),
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: () => _confirmDeleteAccount(context, ref),
            style: TextButton.styleFrom(foregroundColor: const Color(0xFFB42318)),
            child: Text(s.get('app.account.delete')),
          ),
        ],
      ),
    );
  }
}

Future<void> _confirmDeleteAccount(BuildContext context, WidgetRef ref) async {
  final s = context.tr;
  final proceed = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(s.get('app.account.deleteTitle')),
      content: Text(s.get('app.account.deleteBody')),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.get('app.common.cancel'))),
        TextButton(
          onPressed: () => Navigator.pop(ctx, true),
          style: TextButton.styleFrom(foregroundColor: const Color(0xFFB42318)),
          child: Text(s.get('app.common.continue')),
        ),
      ],
    ),
  );
  if (proceed != true || !context.mounted) return;

  final confirmed = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(s.get('app.account.confirmDeleteTitle')),
      content: Text(s.get('app.account.confirmDeleteBody')),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.get('app.common.cancel'))),
        FilledButton(
          onPressed: () => Navigator.pop(ctx, true),
          style: FilledButton.styleFrom(
            backgroundColor: const Color(0xFFB42318),
            foregroundColor: Colors.white,
          ),
          child: Text(s.get('app.account.deletePermanently')),
        ),
      ],
    ),
  );
  if (confirmed != true || !context.mounted) return;

  showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => PopScope(
      canPop: false,
      child: AlertDialog(
        content: Row(
          children: [
            const CircularProgressIndicator(),
            const SizedBox(width: 20),
            Expanded(child: Text(s.get('app.account.deleting'))),
          ],
        ),
      ),
    ),
  );

  try {
    await ref.read(authServiceProvider).deleteAccount();
    ref.invalidate(profileProvider);
    if (context.mounted) {
      Navigator.of(context, rootNavigator: true).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(s.get('app.account.deleted'))),
      );
      context.go('/home');
    }
  } catch (e) {
    if (context.mounted) {
      Navigator.of(context, rootNavigator: true).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(formatUserFacingError(e))),
      );
    }
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text,
        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.textMuted),
      ),
    );
  }
}

class _HubGrid extends StatelessWidget {
  const _HubGrid({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final cols = isWideLayout(context) ? 3 : 2;
    return GridView.count(
      crossAxisCount: cols,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: cols >= 3 ? 1.8 : 1.6,
      children: children,
    );
  }
}

class _HubCard extends StatelessWidget {
  const _HubCard({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: AppColors.accent),
              const SizedBox(height: 8),
              Text(
                label,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key});

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  bool _isCompleted(String status) {
    final n = status.toLowerCase();
    return n.contains('delivered') || n.contains('cancelled');
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authStateProvider).value?.session?.user;
    final s = context.tr;

    if (user == null) {
      return Scaffold(
        backgroundColor: AppColors.canvas,
        appBar: AppBar(
          title: Text(s.get('orders.title')),
          backgroundColor: AppColors.canvas,
        ),
        body: Center(
          child: FilledButton(
            onPressed: () => context.push('/login'),
            child: Text(s.get('app.orders.signIn')),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: Text(s.get('orders.title')),
        centerTitle: true,
        backgroundColor: AppColors.canvas,
        bottom: TabBar(
          controller: _tabs,
          labelColor: AppColors.darkGreen,
          unselectedLabelColor: AppColors.textMuted,
          indicatorColor: AppColors.darkGreen,
          indicatorWeight: 3,
          tabs: [
            Tab(text: s.get('app.orders.inProgress')),
            Tab(text: s.get('app.orders.completed')),
          ],
        ),
      ),
      body: FutureBuilder<List<Order>>(
        future: apiClientProvider.fetchOrders(user.id),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: AppColors.darkGreen));
          }
          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(formatLoadError(snapshot.error!), textAlign: TextAlign.center),
              ),
            );
          }
          final orders = snapshot.data ?? [];

          return TabBarView(
            controller: _tabs,
            children: [
              _OrderList(
                orders: orders.where((o) => !_isCompleted(o.status)).toList(),
                emptyMessage: s.get('app.orders.noneInProgress'),
              ),
              _OrderList(
                orders: orders.where((o) => _isCompleted(o.status)).toList(),
                emptyMessage: s.get('app.orders.noneCompleted'),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _OrderList extends ConsumerWidget {
  const _OrderList({required this.orders, required this.emptyMessage});

  final List<Order> orders;
  final String emptyMessage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final formatPrice = ref.watch(formatPriceProvider);
    if (orders.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(emptyMessage, style: const TextStyle(color: AppColors.textMuted)),
            TextButton(onPressed: () => context.go('/shop'), child: Text(context.tr.get('common.shopNow'))),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(20),
      itemCount: orders.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final order = orders[index];
        final shortId = order.id.length > 8 ? order.id.substring(0, 8).toUpperCase() : order.id.toUpperCase();

        return Material(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          elevation: 0,
          shadowColor: AppColors.darkGreen.withValues(alpha: 0.08),
          child: InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: () => context.push('/orders/${order.id}'),
            child: Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                boxShadow: softCardShadow,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('#$shortId', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                      Text(
                        formatPrice(order.total),
                        style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.darkGreen),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    context.tr.orderStatus(order.status),
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                  ),
                  const SizedBox(height: 10),
                  OrderProgress(status: order.status, compact: true),
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    height: 42,
                    child: OutlinedButton(
                      onPressed: () => context.push('/orders/${order.id}'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.darkGreen,
                        side: const BorderSide(color: AppColors.darkGreen),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text(
                        context.tr.get('orders.trackOrder'),
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}