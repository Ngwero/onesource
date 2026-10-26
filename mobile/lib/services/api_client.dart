import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart' show debugPrint;
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/env.dart';
import 'auth_service.dart' show isSupabaseReady;
import '../models/app_notification.dart';
import '../models/hero_slide.dart';
import '../models/order.dart';
import '../models/product.dart';
import '../i18n/app_strings.dart';

String _t(String key, String en) =>
    AppStrings.current.or('app.errors.$key', en);

class ProductsPageResult {
  const ProductsPageResult({
    required this.products,
    required this.total,
    required this.page,
    required this.pageSize,
    this.serverHasMore,
  });

  final List<Product> products;
  final int total;
  final int page;
  final int pageSize;

  /// `hasMore` from the API; null on older deployments that only send `total`.
  final bool? serverHasMore;

  bool get hasMore => serverHasMore ?? (page + 1) * pageSize < total;
}

/// Aisles whose id starts with another aisle's id (`cookware` vs `cookware-accessories`).
const _nestedAisles = <String, List<String>>{
  'cookware': ['cookware-accessories'],
};

class ApiClient {
  ApiClient({http.Client? client, String? Function()? accessToken})
      : _client = client ?? http.Client(), _accessToken = accessToken;

  final http.Client _client;
  final String? Function()? _accessToken;
  final Map<String, String> _guestOrderTokens = {};

  Map<String, String> _orderHeaders([String? orderId]) {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (_accessToken != null) {
      final token = _accessToken();
      if (token != null) headers['Authorization'] = 'Bearer $token';
    } else if (isSupabaseReady) {
      final session = Supabase.instance.client.auth.currentSession;
      if (session != null) headers['Authorization'] = 'Bearer ${session.accessToken}';
    }
    final guestToken = _guestOrderTokens[orderId];
    if (guestToken != null) headers['X-Order-Token'] = guestToken;
    return headers;
  }


  /// When production API ignores `shop=fresh`, newest rows are all kitchen.
  int? _catalogTotal;

  /// `true` once we know the live API honours `shop=fresh`.
  bool? _shopFilterSupported;

  Uri _uri(String path, [Map<String, String>? query]) {
    final base = Env.apiBaseUrl.replaceAll(RegExp(r'/$'), '');
    return Uri.parse('$base$path').replace(queryParameters: query);
  }

  /// GET requests are safe to retry. Mobile radios regularly drop the first
  /// request while waking or changing between Wi-Fi and cellular data.
  Future<http.Response> _getWithRetry(
    Uri uri, {
    Duration timeout = const Duration(seconds: 12),
    Map<String, String>? headers,
  }) async {
    Object? lastError;
    const attempts = 3;
    for (var attempt = 0; attempt < attempts; attempt++) {
      try {
        final response = await _client.get(uri, headers: headers).timeout(timeout);
        if (!_retryableStatus(response.statusCode) || attempt == attempts - 1) {
          return response;
        }
        debugPrint('[OneSource] GET retry after ${response.statusCode}: $uri');
      } catch (error) {
        lastError = error;
        if (attempt == attempts - 1) break;
        debugPrint(
            '[OneSource] GET retry after transport error: $uri ($error)');
      }
      await Future<void>.delayed(
        Duration(milliseconds: attempt == 0 ? 350 : 900),
      );
    }
    // A failed shop request does not prove the device is offline. Check an
    // independent connectivity endpoint before choosing the offline screen.
    if (await _internetIsReachable()) {
      throw ApiException(
        _t('server',
            'Our servers are temporarily unavailable. Please try again shortly.'),
      );
    }
    Error.throwWithStackTrace(lastError!, StackTrace.current);
  }

  static bool _retryableStatus(int status) =>
      status == 408 ||
      status == 429 ||
      status == 500 ||
      status == 502 ||
      status == 503 ||
      status == 504;

  Future<bool> _internetIsReachable() async {
    try {
      final response = await _client
          .get(Uri.parse('https://connectivitycheck.gstatic.com/generate_204'))
          .timeout(const Duration(seconds: 3));
      return response.statusCode == 204 || response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  static bool _isKitchenSku(Product p) =>
      p.id.startsWith('kitchen-') || p.category == 'kitchen-ware';

  static bool _isCosmeticsSku(Product p) =>
      p.id.startsWith('cosmetics-') || p.category == 'cosmetics';

  static bool _isPharmacySku(Product p) =>
      p.id.startsWith('pharmacy-') || p.category == 'pharmacy';

  /// Kitchen, Cosmetics or Pharmacy item — never shown in the Fresh shop.
  static bool _isOtherShopSku(Product p) =>
      _isKitchenSku(p) || _isCosmeticsSku(p) || _isPharmacySku(p);

  /// Export sodas / Place-order SKUs — export shop only, not Fresh All products.
  static bool _isExportCatalogueSku(Product p) =>
      p.id.startsWith('drink-') || p.category == 'export-fresh-produce';

  static bool _isFreshProduceSku(Product p) =>
      !_isOtherShopSku(p) && !_isExportCatalogueSku(p);

  Future<bool> checkHealth() async {
    try {
      final res = await _getWithRetry(
        _uri('/health/live'),
        timeout: const Duration(seconds: 6),
      );
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
    bool sale = false,
    bool prime = false,
    String? sort,
    bool allowServerErrorAsEmpty = false,
  }) async {
    final params = <String, String>{
      'page': '$page',
      'pageSize': '$pageSize',
      // Cards only: skip descriptions and details so listings stay small.
      'fields': 'card',
    };
    if (category != null && category.isNotEmpty) params['category'] = category;
    if (query != null && query.isNotEmpty) params['q'] = query;
    if (shop != null && shop.isNotEmpty) params['shop'] = shop;
    if (aisle != null && aisle.isNotEmpty) params['aisle'] = aisle;
    if (sale) params['sale'] = '1';
    if (prime) params['prime'] = '1';
    if (sort != null && sort.isNotEmpty) params['sort'] = sort;

    final uri = _uri('/products', params);
    debugPrint('[OneSource] GET $uri');
    final res = await _getWithRetry(uri);
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
    final hasMore = data['hasMore'];
    return ProductsPageResult(
      products:
          list.map((e) => Product.fromJson(e as Map<String, dynamic>)).toList(),
      total: total,
      page: page,
      pageSize: pageSize,
      serverHasMore: hasMore is bool ? hasMore : null,
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
    final fresh = mapped.products.where(_isFreshProduceSku).toList();
    final total =
        fresh.isEmpty ? logicalPage * pageSize : (logicalPage + 2) * pageSize;
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

    /// `fresh` excludes specialty SKUs; `kitchen`, `cosmetics`, and `pharmacy` return that shop only.
    String? shop,

    /// Aisle id within a specialty shop — filters `{shop}-{aisle}-%`.
    String? aisle,

    /// Server-side filters/sort (`sale=1`, `prime=1`, `sort=…`); older APIs ignore them.
    bool sale = false,
    bool prime = false,
    String? sort,
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
      shop: hasAisle && scopedShop != 'cosmetics' && scopedShop != 'pharmacy'
          ? 'kitchen'
          : scopedShop,
      aisle: scopedAisle,
      sale: sale,
      prime: prime,
      sort: sort,
    );

    if (hasAisle) {
      final prefix = scopedShop == 'cosmetics'
          ? 'cosmetics'
          : scopedShop == 'pharmacy'
              ? 'pharmacy'
              : 'kitchen';
      final nested = _nestedAisles[scopedAisle] ?? const <String>[];
      final matched = raw.products
          .where((p) =>
              p.id.startsWith('$prefix-$scopedAisle-') &&
              !nested.any((n) => p.id.startsWith('$prefix-$n-')))
          .toList();
      return ProductsPageResult(
        products: matched,
        total: matched.isEmpty && page == 0
            ? 0
            : (raw.total > 0 ? raw.total : matched.length),
        page: page,
        pageSize: pageSize,
        serverHasMore: raw.serverHasMore,
      );
    }

    if (scopedShop == 'pharmacy' && !hasCategory) {
      return ProductsPageResult(
        products: raw.products.where(_isPharmacySku).toList(),
        total: raw.total,
        page: page,
        pageSize: pageSize,
        serverHasMore: raw.serverHasMore,
      );
    }

    if (scopedShop == 'cosmetics' && !hasCategory) {
      return ProductsPageResult(
        products: raw.products.where(_isCosmeticsSku).toList(),
        total: raw.total,
        page: page,
        pageSize: pageSize,
        serverHasMore: raw.serverHasMore,
      );
    }

    // Kitchen-only feed: old APIs already return kitchen first — just filter.
    if (scopedShop == 'kitchen' && !hasCategory) {
      final kitchen = raw.products.where(_isKitchenSku).toList();
      // Empty kitchen page ⇒ we've left the kitchen block; stop pagination.
      final total = kitchen.isEmpty
          ? page * pageSize
          : (raw.total > 0 ? raw.total : kitchen.length);
      final leftKitchenBlock = kitchen.isEmpty && raw.products.isNotEmpty;
      return ProductsPageResult(
        products: kitchen,
        total: total,
        page: page,
        pageSize: pageSize,
        serverHasMore: leftKitchenBlock ? false : raw.serverHasMore,
      );
    }

    // Fresh feed: if API applied shop filter, keep response (strip stragglers).
    if (scopedShop == 'fresh' && !hasCategory && !hasQuery) {
      final allKitchen =
          raw.products.isNotEmpty && raw.products.every(_isOtherShopSku);
      if (!allKitchen) {
        _shopFilterSupported = true;
        return ProductsPageResult(
          products: raw.products.where(_isFreshProduceSku).toList(),
          total: raw.total,
          page: page,
          pageSize: pageSize,
          serverHasMore: raw.serverHasMore,
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
        products: raw.products.where((p) => !_isOtherShopSku(p)).toList(),
        total: raw.total,
        page: page,
        pageSize: pageSize,
        serverHasMore: raw.serverHasMore,
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
    final res = await _getWithRetry(_uri('/products/$id'));
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
        final res = await _getWithRetry(
          _uri(path),
          timeout: const Duration(seconds: 8),
        );
        if (res.statusCode != 200) continue;
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        final list = data['categories'] as List<dynamic>? ?? [];
        return list
            .map((e) => Category.fromJson(e as Map<String, dynamic>))
            .toList();
      } catch (_) {
        continue;
      }
    }
    return [];
  }

  /// Country of the device's IP address (no GPS); null when unknown or offline.
  Future<String?> fetchGeoCountry() async {
    try {
      final res =
          await _client.get(_uri('/geo')).timeout(const Duration(seconds: 6));
      if (res.statusCode != 200) return null;
      final data = jsonDecode(res.body);
      final country = data is Map<String, dynamic> ? data['country'] : null;
      return country is String && RegExp(r'^[A-Z]{2}$').hasMatch(country)
          ? country
          : null;
    } catch (e) {
      debugPrint('[OneSource] geo lookup failed: $e');
      return null;
    }
  }

  Future<List<AppNotification>> fetchNotifications() async {
    try {
      final res = await _getWithRetry(
        _uri('/notifications'),
        timeout: const Duration(seconds: 8),
      );
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
      if (scoped == 'pharmacy') return HeroSlide.pharmacyDefaults;
      if (scoped == 'onboarding') return HeroSlide.onboardingDefaults;
      return HeroSlide.defaults;
    }

    try {
      final res = await _getWithRetry(
        _uri('/hero/slides', {'placement': scoped}),
        timeout: const Duration(seconds: 8),
      );
      if (res.statusCode != 200) return fallback();
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final list = data['slides'] as List<dynamic>? ?? [];
      var slides = list
          .map((e) => HeroSlide.fromJson(e as Map<String, dynamic>))
          .toList();
      // Older APIs may ignore placement=onboarding — keep only matching IDs.
      if (scoped == 'onboarding') {
        slides = slides.where((s) => s.id.startsWith('onboarding-')).toList();
      } else if (scoped == 'kitchen') {
        slides = slides.where((s) => s.id.startsWith('kitchen-')).toList();
      } else if (scoped == 'pharmacy') {
        slides = slides.where((s) => s.id.startsWith('pharmacy-')).toList();
      } else if (scoped == 'home') {
        slides = slides
            .where(
              (s) =>
                  !s.id.startsWith('kitchen-') &&
                  !s.id.startsWith('cosmetics-') &&
                  !s.id.startsWith('pharmacy-') &&
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
    final res = await _getWithRetry(_uri('/orders', {'userId': userId}), headers: _orderHeaders());
    if (res.statusCode != 200) {
      throw ApiException(_errorMessage(res));
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final list = data['orders'] as List<dynamic>? ?? [];
    return list.map((e) => Order.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Order> fetchOrderById(String id, {String? userId}) async {
    final params = userId != null ? {'userId': userId} : null;
    final res = await _getWithRetry(_uri('/orders/$id', params), headers: _orderHeaders(id));
    if (res.statusCode == 404) {
      throw ApiException(_t('orderNotFound', 'Order not found'));
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
      headers: _orderHeaders(),
      body: jsonEncode(payload.toJson()),
    );
    if (res.statusCode != 201 && res.statusCode != 200) {
      throw ApiException(_errorMessage(res));
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final order = Order.fromJson(data['order'] as Map<String, dynamic>);
    final token = data['accessToken'];
    if (token is String) _guestOrderTokens[order.id] = token;
    return order;
  }

  Future<LoginStartResult> requestLoginOtp(
      String email, String password) async {
    final res = await _client
        .post(
          _uri('/auth/login/request-otp'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(
              {'email': email.trim().toLowerCase(), 'password': password}),
        )
        .timeout(const Duration(seconds: 45));

    if (res.statusCode == 401) {
      throw ApiException(_t(
          'wrongPassword', 'Incorrect email or password. Please try again.'));
    }
    if (res.statusCode == 429) {
      throw ApiException(_t('tooMany',
          'Too many attempts. Please wait a few minutes and try again.'));
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
      throw ApiException(
          _t('generic', 'Something went wrong. Please try again.'));
    }
    return (accessToken: accessToken, refreshToken: refreshToken);
  }

  Future<void> requestPasswordReset(String email, String redirectTo) async {
    final res = await _client
        .post(
          _uri('/auth/forgot-password'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(
              {'email': email.trim().toLowerCase(), 'redirectTo': redirectTo}),
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
    final res = await _client.delete(
      _uri('/auth/account'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
    ).timeout(const Duration(seconds: 45));

    if (res.statusCode == 401) {
      throw ApiException(
          _t('signInAgain', 'Please sign in again to continue.'));
    }
    if (res.statusCode != 200) {
      throw ApiException(_errorMessage(res));
    }
  }

  /// Create account via API (Admin + Brevo welcome) — avoids Supabase confirm email.
  Future<({String? accessToken, String? refreshToken, bool needsSignIn})>
      signUp({
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
      return _t('server',
          'Our servers are temporarily unavailable. Please try again shortly.');
    }
    if (res.statusCode == 404) {
      return _t('notFound', 'We could not find what you were looking for.');
    }
    if (res.statusCode == 401 || res.statusCode == 403) {
      return _t('signInAgain', 'Please sign in again to continue.');
    }
    if (res.statusCode == 429) {
      return _t('tooMany',
          'Too many attempts. Please wait a few minutes and try again.');
    }
    return _t('generic', 'Something went wrong. Please try again.');
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
