import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../providers/currency_provider.dart';
import '../models/order.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
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

    if (user == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Account')),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Spacer(),
                const Center(child: BrandLogoMark(size: 72, showWordmark: true)),
                const SizedBox(height: 28),
                const Text(
                  'Sign in when you\'re ready',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Browse and shop without an account. Sign in to track orders and save your details.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.textMuted, height: 1.45),
                ),
                const SizedBox(height: 28),
                ElevatedButton(onPressed: () => context.push('/login'), child: const Text('Sign in')),
                const SizedBox(height: 10),
                OutlinedButton(onPressed: () => context.push('/signup'), child: const Text('Create account')),
                const Spacer(flex: 2),
                TextButton(
                  onPressed: () => context.go('/home'),
                  child: const Text('Continue browsing'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final name = profileAsync.value?.fullName ?? user.email ?? 'Customer';
    final initials = name.isNotEmpty ? name.substring(0, 1).toUpperCase() : '?';
    final strings = ref.watch(stringsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Account')),
      body: ListView(
        padding: const EdgeInsets.all(16),
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
                        Text('Hello, $name', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
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
          const Text('Shop', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.textMuted)),
          const SizedBox(height: 8),
          _HubGrid(children: [
            _HubCard(icon: Icons.storefront_outlined, label: 'Browse shop', onTap: () => context.go('/shop')),
            _HubCard(icon: Icons.grid_view_rounded, label: 'Categories', onTap: () => context.go('/categories')),
            _HubCard(icon: Icons.search, label: 'Search', onTap: () => context.push('/search')),
            _HubCard(icon: Icons.shopping_cart_outlined, label: 'Basket', onTap: () => context.go('/cart')),
          ]),
          const SizedBox(height: 20),
          const Text('Activity', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.textMuted)),
          const SizedBox(height: 8),
          _HubGrid(children: [
            _HubCard(icon: Icons.receipt_long, label: 'Orders', onTap: () => context.push('/orders')),
            _HubCard(icon: Icons.payment_outlined, label: 'Checkout', onTap: () => context.push('/checkout')),
          ]),
          const SizedBox(height: 24),
          OutlinedButton(
            onPressed: () async {
              await ref.read(authServiceProvider).signOut();
              if (context.mounted) context.go('/home');
            },
            child: const Text('Sign out'),
          ),
        ],
      ),
    );
  }
}

class _HubGrid extends StatelessWidget {
  const _HubGrid({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 1.6,
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
              Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
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

    if (user == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('My orders')),
        body: Center(
          child: FilledButton(
            onPressed: () => context.push('/login'),
            child: const Text('Sign in to view orders'),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: const Text('My orders'),
        centerTitle: true,
        backgroundColor: AppColors.canvas,
        bottom: TabBar(
          controller: _tabs,
          labelColor: AppColors.darkGreen,
          unselectedLabelColor: AppColors.textMuted,
          indicatorColor: AppColors.darkGreen,
          indicatorWeight: 3,
          tabs: const [
            Tab(text: 'In progress'),
            Tab(text: 'Completed'),
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
            return Center(child: Text(snapshot.error.toString()));
          }
          final orders = snapshot.data ?? [];

          return TabBarView(
            controller: _tabs,
            children: [
              _OrderList(
                orders: orders.where((o) => !_isCompleted(o.status)).toList(),
                emptyMessage: 'No orders in progress',
              ),
              _OrderList(
                orders: orders.where((o) => _isCompleted(o.status)).toList(),
                emptyMessage: 'No completed orders yet',
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
            TextButton(onPressed: () => context.go('/shop'), child: const Text('Start shopping')),
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
                    order.status.replaceAll('_', ' '),
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
                      child: const Text('Track order', style: TextStyle(fontWeight: FontWeight.w700)),
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