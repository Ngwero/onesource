import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter/material.dart';

import '../screens/account_screen.dart';
import '../screens/app_shell.dart';
import '../screens/auth_screens.dart';
import '../screens/checkout_screen.dart';
import '../screens/order_detail_screen.dart';
import '../screens/product_detail_screen.dart';
import '../screens/splash_screen.dart';
import '../screens/category_screen.dart';
import '../screens/search_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/splash',
    debugLogDiagnostics: true,
    errorBuilder: (context, state) => Scaffold(
      appBar: AppBar(title: const Text('One Source')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            state.error?.toString() ?? 'Page not found',
            textAlign: TextAlign.center,
          ),
        ),
      ),
    ),
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
      ShellRoute(
        builder: (context, state, child) => AppShell(
          location: state.uri.toString(),
          child: child,
        ),
        routes: [
          GoRoute(path: '/home', builder: (_, __) => const TabHomeScreen()),
          GoRoute(path: '/categories', builder: (_, __) => const TabCategoriesScreen()),
          GoRoute(path: '/shop', builder: (_, __) => const TabShopScreen()),
          GoRoute(path: '/cart', builder: (_, __) => const TabCartScreen()),
          GoRoute(path: '/account', builder: (_, __) => const TabAccountScreen()),
        ],
      ),
      GoRoute(
        path: '/product/:id',
        builder: (context, state) => ProductDetailScreen(productId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/category/:id',
        builder: (context, state) => CategoryScreen(categoryId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/search',
        builder: (context, state) => SearchScreen(
          initialQuery: state.uri.queryParameters['q'],
        ),
      ),
      GoRoute(path: '/checkout', builder: (_, __) => const CheckoutScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/signup', builder: (_, __) => const SignupScreen()),
      GoRoute(path: '/forgot-password', builder: (_, __) => const ForgotPasswordScreen()),
      GoRoute(path: '/orders', builder: (_, __) => const OrdersScreen()),
      GoRoute(
        path: '/orders/:id',
        builder: (context, state) => OrderDetailScreen(orderId: state.pathParameters['id']!),
      ),
    ],
  );
});
