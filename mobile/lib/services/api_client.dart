import 'dart:convert';

import 'package:flutter/foundation.dart' show debugPrint;
import 'package:http/http.dart' as http;

import '../config/env.dart';
import '../models/app_notification.dart';
import '../models/hero_slide.dart';
import '../models/order.dart';
import '../models/product.dart';

class ProductsPageResult {
  const ProductsPageResult({
    required this.products,
    required this.total,
    required this.page,
    required this.pageSize,
  });

  final List<Product> products;
  final int total;
  final int page;
  final int pageSize;

  bool get hasMore => (page + 1) * pageSize < total;
}

class ApiClient {
  ApiClient({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  /// When production API ignores `shop=fresh`, newest rows are all kitchen.
  int? _catalogTotal;

  /// `true` once we know the live API honours `shop=fresh`.
  bool? _shopFilterSupported;

  Uri _uri(String path, [Map<String, String>? query]) {
    final base = Env.apiBaseUrl.replaceAll(RegExp(r'/$'), '');
    return Uri.parse('$base$path').replace(queryParameters: query);
  }

  static bool _isKitchenSku(Product p) =>
      p.id.startsWith('kitchen-') || p.category == 'kitchen-ware';

  Future<bool> checkHealth() async {
    try {
      final res = await _client.get(_uri('/health')).timeout(const Duration(seconds: 10));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<ProductsPageResult> _rawProductsPage({
    String? category,
    String? query,
    int page = 0,
    int pageSize = 24,
    String? shop,
    String? aisle,
    bool allowServerErrorAsEmpty = false,
  }) async {
    final params = <String, String>{
      'page': '$page',
      'pageSize': '$pageSize',
    };
    if (category != null && category.isNotEmpty) params['category'] = category;
    if (query != null && query.isNotEmpty) params['q'] = query;
    if (shop != null && shop.isNotEmpty) params['shop'] = shop;
    if (aisle != null && aisle.isNotEmpty) params['aisle'] = aisle;

    final uri = _uri('/products', params);
    debugPrint('[OneSource] GET $uri');
    final res = await _client.get(uri).timeout(const Duration(seconds: 25));
    debugPrint('[OneSource] products status=${res.statusCode} page=$page');
    if (res.statusCode != 200) {
      if (allowServerErrorAsEmpty && res.statusCode >= 500) {
        return ProductsPageResult(
          products: const [],
          total: 0,
          page: page,
          pageSize: pageSize,
        );
      }
      throw ApiException(_errorMessage(res));
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final list = data['products'] as List<dynamic>? ?? [];
    final total = (data['total'] as num?)?.toInt() ?? list.length;
    return ProductsPageResult(
      products: list.map((e) => Product.fromJson(e as Map<String, dynamic>)).toList(),
      total: total,
      page: page,
      pageSize: pageSize,
    );
  }

  /// When `shop=fresh` is ignored, newest pages are kitchen. Read from the
  /// oldest end of the catalogue instead (one extra request, no binary search).
  Future<ProductsPageResult> _freshFromCatalogTail({
    required int logicalPage,
    required int pageSize,
    required int catalogTotal,
  }) async {
    _catalogTotal = catalogTotal;
    final last = catalogTotal <= 0 ? 0 : ((catalogTotal - 1) ~/ pageSize);
    final target = (last - logicalPage).clamp(0, last);
    final mapped = await _rawProductsPage(
      page: target,
      pageSize: pageSize,
      allowServerErrorAsEmpty: true,
    );
    final fresh = mapped.products.where((p) => !_isKitchenSku(p)).toList();
    final total = fresh.isEmpty
        ? logicalPage * pageSize
        : (logicalPage + 2) * pageSize;
    return ProductsPageResult(
      products: fresh,
      total: total,
      page: logicalPage,
      pageSize: pageSize,
    );
  }

  Future<ProductsPageResult> fetchProductsPage({
    String? category,
    String? query,
    int page = 0,
    int pageSize = 24,
    /// `fresh` excludes kitchen SKUs; `kitchen` returns kitchen-only.
    String? shop,
    /// Kitchen aisle id (`cookware`, `tabletop`, …) — filters `kitchen-{aisle}-%`.
    String? aisle,
  }) async {
    final scopedShop = shop?.trim().toLowerCase();
    final scopedAisle = aisle?.trim().toLowerCase();
    final hasCategory = category != null && category.isNotEmpty;
    final hasQuery = query != null && query.isNotEmpty;
    final hasAisle = scopedAisle != null && scopedAisle.isNotEmpty;

    // Known-broken production API: skip the kitchen prefix entirely.
    if (scopedShop == 'fresh' &&
        !hasCategory &&
        !hasQuery &&
        !hasAisle &&
        _shopFilterSupported == false) {
      var total = _catalogTotal;
      if (total == null) {
        final meta = await _rawProductsPage(page: 0, pageSize: 1);
        total = meta.total;
      }
      return _freshFromCatalogTail(
        logicalPage: page,
        pageSize: pageSize,
        catalogTotal: total,
      );
    }

    final raw = await _rawProductsPage(
      category: category,
      query: query,
      page: page,
      pageSize: pageSize,
      shop: hasAisle ? 'kitchen' : scopedShop,
      aisle: scopedAisle,
    );

    if (hasAisle) {
      final matched = raw.products
          .where((p) => p.id.startsWith('kitchen-$scopedAisle-'))
          .toList();
      return ProductsPageResult(
        products: matched,
        total: matched.isEmpty ? 0 : (raw.total > 0 ? raw.total : matched.length),
        page: page,
        pageSize: pageSize,
      );
    }

    // Kitchen-only feed: old APIs already return kitchen first — just filter.
    if (scopedShop == 'kitchen' && !hasCategory) {
      final kitchen = raw.products.where(_isKitchenSku).toList();
      // Empty kitchen page ⇒ we've left the kitchen block; stop pagination.
      final total = kitchen.isEmpty
          ? page * pageSize
          : (raw.total > 0 ? raw.total : kitchen.length);
      return ProductsPageResult(
        products: kitchen,
        total: total,
        page: page,
        pageSize: pageSize,
      );
    }

    // Fresh feed: if API applied shop filter, keep response (strip stragglers).
    if (scopedShop == 'fresh' && !hasCategory && !hasQuery) {
      final allKitchen =
          raw.products.isNotEmpty && raw.products.every(_isKitchenSku);
      if (!allKitchen) {
        _shopFilterSupported = true;
        return ProductsPageResult(
          products: raw.products.where((p) => !_isKitchenSku(p)).toList(),
          total: raw.total,
          page: page,
          pageSize: pageSize,
        );
      }

      // Production still returns kitchen for shop=fresh — read from the tail.
      _shopFilterSupported = false;
      debugPrint('[OneSource] shop=fresh ignored by API — using catalog tail');
      return _freshFromCatalogTail(
        logicalPage: page,
        pageSize: pageSize,
        catalogTotal: raw.total,
      );
    }

    if (scopedShop == 'fresh') {
      return ProductsPageResult(
        products: raw.products.where((p) => !_isKitchenSku(p)).toList(),
        total: raw.total,
        page: page,
        pageSize: pageSize,
      );
    }

    return raw;
  }

  Future<List<Product>> fetchProducts({
    String? category,
    String? query,
    String? shop,
  }) async {
    final all = <Product>[];
    var page = 0;
    const pageSize = 200;
    var total = 1;
    while (all.length < total && page < 40) {
      final result = await fetchProductsPage(
        category: category,
        query: query,
        shop: shop,
        page: page,
        pageSize: pageSize,
      );
      all.addAll(result.products);
      total = result.total;
      if (result.products.isEmpty) break;
      page++;
    }
    return all;
  }

  Future<Product?> fetchProductById(String id) async {
    final res = await _client.get(_uri('/products/$id'));
    if (res.statusCode == 404) return null;
    if (res.statusCode != 200) {
      throw ApiException(_errorMessage(res));
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return Product.fromJson(data['product'] as Map<String, dynamic>);
  }

  Future<List<Category>> fetchCategories() async {
    for (final path in ['/categories', '/products/categories']) {
      try {
        final res = await _client.get(_uri(path));
        if (res.statusCode != 200) continue;
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        final list = data['categories'] as List<dynamic>? ?? [];
        return list.map((e) => Category.fromJson(e as Map<String, dynamic>)).toList();
      } catch (_) {
        continue;
      }
    }
    return [];
  }

  Future<List<AppNotification>> fetchNotifications() async {
    try {
      final res = await _client
          .get(_uri('/notifications'))
          .timeout(const Duration(seconds: 15));
      if (res.statusCode != 200) return const [];
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final list = data['notifications'] as List<dynamic>? ?? [];
      return list
          .map((e) => AppNotification.fromJson(e as Map<String, dynamic>))
          .where((n) => n.id.isNotEmpty && n.active)
          .toList();
    } catch (e) {
      debugPrint('[OneSource] notifications error: $e');
      return const [];
    }
  }

  Future<List<HeroSlide>> fetchHeroSlides({String placement = 'home'}) async {
    final scoped = placement.trim().isEmpty ? 'home' : placement.trim();
    List<HeroSlide> fallback() {
      if (scoped == 'kitchen') return HeroSlide.kitchenDefaults;
      if (scoped == 'onboarding') return HeroSlide.onboardingDefaults;
      return HeroSlide.defaults;
    }

    try {
      final res = await _client.get(
        _uri('/hero/slides', {'placement': scoped}),
      );
      if (res.statusCode != 200) return fallback();
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final list = data['slides'] as List<dynamic>? ?? [];
      var slides =
          list.map((e) => HeroSlide.fromJson(e as Map<String, dynamic>)).toList();
      // Older APIs may ignore placement=onboarding — keep only matching IDs.
      if (scoped == 'onboarding') {
        slides = slides
            .where((s) => s.id.startsWith('onboarding-'))
            .toList();
      } else if (scoped == 'kitchen') {
        slides = slides.where((s) => s.id.startsWith('kitchen-')).toList();
      } else if (scoped == 'home') {
        slides = slides
            .where(
              (s) =>
                  !s.id.startsWith('kitchen-') &&
                  !s.id.startsWith('export-') &&
                  !s.id.startsWith('onboarding-'),
            )
            .toList();
      }
      slides.sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
      if (slides.isNotEmpty) return slides;
      return fallback();
    } catch (_) {
      return fallback();
    }
  }

  Future<List<Order>> fetchOrders(String userId) async {
    final res = await _client.get(_uri('/orders', {'userId': userId}));
    if (res.statusCode != 200) {
      throw ApiException(_errorMessage(res));
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final list = data['orders'] as List<dynamic>? ?? [];
    return list.map((e) => Order.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Order> fetchOrderById(String id, {String? userId}) async {
    final params = userId != null ? {'userId': userId} : null;
    final res = await _client.get(_uri('/orders/$id', params));
    if (res.statusCode == 404) {
      throw ApiException('Order not found');
    }
    if (res.statusCode != 200) {
      throw ApiException(_errorMessage(res));
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return Order.fromJson(data['order'] as Map<String, dynamic>);
  }

  Future<Order> placeOrder(CreateOrderPayload payload) async {
    final res = await _client.post(
      _uri('/orders'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload.toJson()),
    );
    if (res.statusCode != 201 && res.statusCode != 200) {
      throw ApiException(_errorMessage(res));
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return Order.fromJson(data['order'] as Map<String, dynamic>);
  }

  Future<LoginStartResult> requestLoginOtp(String email, String password) async {
    final res = await _client
        .post(
          _uri('/auth/login/request-otp'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'email': email.trim().toLowerCase(), 'password': password}),
        )
        .timeout(const Duration(seconds: 45));

    if (res.statusCode == 401) {
      throw ApiException('Invalid email or password.');
    }
    if (res.statusCode == 429) {
      throw ApiException('Too many login attempts. Please wait a few minutes.');
    }
    if (res.statusCode == 503) {
      throw ApiException(_errorMessage(res));
    }
    if (res.statusCode != 200) {
      throw ApiException(_errorMessage(res));
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final accessToken = data['accessToken'] as String?;
    final refreshToken = data['refreshToken'] as String?;
    final otpRequired = data['otpRequired'] != false;
    if (accessToken != null && refreshToken != null) {
      return LoginStartResult(
        otpRequired: false,
        accessToken: accessToken,
        refreshToken: refreshToken,
      );
    }
    return LoginStartResult(otpRequired: otpRequired);
  }

  Future<({String accessToken, String refreshToken})> verifyLoginOtp(
    String email,
    String otp,
  ) async {
    final res = await _client
        .post(
          _uri('/auth/login/verify-otp'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'email': email.trim().toLowerCase(),
            'otp': otp.trim(),
          }),
        )
        .timeout(const Duration(seconds: 45));

    if (res.statusCode == 401) {
      throw ApiException(_errorMessage(res));
    }
    if (res.statusCode != 200) {
      throw ApiException(_errorMessage(res));
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final accessToken = data['accessToken'] as String?;
    final refreshToken = data['refreshToken'] as String?;
    if (accessToken == null || refreshToken == null) {
      throw ApiException('Invalid login response from server.');
    }
    return (accessToken: accessToken, refreshToken: refreshToken);
  }

  Future<void> requestPasswordReset(String email, String redirectTo) async {
    final res = await _client
        .post(
          _uri('/auth/forgot-password'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'email': email.trim().toLowerCase(), 'redirectTo': redirectTo}),
        )
        .timeout(const Duration(seconds: 45));

    if (res.statusCode == 404) {
      throw ApiException(_errorMessage(res));
    }
    if (res.statusCode != 200) {
      throw ApiException(_errorMessage(res));
    }
  }

  /// Permanently delete the signed-in account (Bearer access token required).
  Future<void> deleteAccount(String accessToken) async {
    final res = await _client
        .delete(
          _uri('/auth/account'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $accessToken',
          },
        )
        .timeout(const Duration(seconds: 45));

    if (res.statusCode == 401) {
      throw ApiException('Please sign in again to delete your account.');
    }
    if (res.statusCode != 200) {
      throw ApiException(_errorMessage(res));
    }
  }

  /// Create account via API (Admin + Brevo welcome) — avoids Supabase confirm email.
  Future<({String? accessToken, String? refreshToken, bool needsSignIn})> signUp({
    required String email,
    required String password,
    required String fullName,
  }) async {
    final res = await _client
        .post(
          _uri('/auth/signup'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'email': email.trim().toLowerCase(),
            'password': password,
            'fullName': fullName.trim(),
          }),
        )
        .timeout(const Duration(seconds: 45));

    if (res.statusCode == 409) {
      throw ApiException(_errorMessage(res));
    }
    if (res.statusCode != 200 && res.statusCode != 201) {
      throw ApiException(_errorMessage(res));
    }

    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final accessToken = data['accessToken'] as String?;
    final refreshToken = data['refreshToken'] as String?;
    final needsSignIn = data['needsSignIn'] == true;
    return (
      accessToken: accessToken,
      refreshToken: refreshToken,
      needsSignIn: needsSignIn || accessToken == null || refreshToken == null,
    );
  }

  String _errorMessage(http.Response res) {
    try {
      final data = jsonDecode(res.body);
      if (data is Map<String, dynamic>) {
        final err = data['error'];
        if (err is String && err.trim().isNotEmpty) return err.trim();
        if (err is Map && err['message'] is String) {
          return (err['message'] as String).trim();
        }
        final msg = data['message'];
        if (msg is String && msg.trim().isNotEmpty) return msg.trim();
      }
    } catch (_) {}

    if (res.statusCode >= 500) {
      return 'Our servers are temporarily unavailable. Please try again shortly.';
    }
    if (res.statusCode == 404) {
      return 'We could not find what you were looking for.';
    }
    if (res.statusCode == 401 || res.statusCode == 403) {
      return 'Please sign in again to continue.';
    }
    if (res.statusCode == 429) {
      return 'Too many attempts. Please wait a few minutes and try again.';
    }
    return 'Something went wrong. Please try again.';
  }
}

class ApiException implements Exception {
  ApiException(this.message);
  final String message;

  @override
  String toString() => message;
}

class LoginStartResult {
  const LoginStartResult({
    required this.otpRequired,
    this.accessToken,
    this.refreshToken,
  });

  final bool otpRequired;
  final String? accessToken;
  final String? refreshToken;
}

final apiClientProvider = ApiClient();
