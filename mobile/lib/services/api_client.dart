import 'dart:convert';

import 'package:flutter/foundation.dart' show debugPrint;
import 'package:http/http.dart' as http;

import '../config/env.dart';
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

  Uri _uri(String path, [Map<String, String>? query]) {
    final base = Env.apiBaseUrl.replaceAll(RegExp(r'/$'), '');
    return Uri.parse('$base$path').replace(queryParameters: query);
  }

  Future<bool> checkHealth() async {
    try {
      final res = await _client.get(_uri('/health')).timeout(const Duration(seconds: 10));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<ProductsPageResult> fetchProductsPage({
    String? category,
    String? query,
    int page = 0,
    int pageSize = 24,
  }) async {
    final params = <String, String>{
      'page': '$page',
      'pageSize': '$pageSize',
    };
    if (category != null && category.isNotEmpty) params['category'] = category;
    if (query != null && query.isNotEmpty) params['q'] = query;

    final uri = _uri('/products', params);
    debugPrint('[OneSource] GET $uri');
    final res = await _client.get(uri).timeout(const Duration(seconds: 25));
    debugPrint('[OneSource] products status=${res.statusCode} page=$page');
    if (res.statusCode != 200) {
      throw ApiException(_errorMessage(res));
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final list = data['products'] as List<dynamic>? ?? [];
    final total = data['total'] as int? ?? list.length;
    return ProductsPageResult(
      products: list.map((e) => Product.fromJson(e as Map<String, dynamic>)).toList(),
      total: total,
      page: page,
      pageSize: pageSize,
    );
  }

  Future<List<Product>> fetchProducts({String? category, String? query}) async {
    final page = await fetchProductsPage(category: category, query: query, page: 0, pageSize: 200);
    return page.products;
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

  Future<List<HeroSlide>> fetchHeroSlides() async {
    try {
      final res = await _client.get(_uri('/hero/slides'));
      if (res.statusCode != 200) return HeroSlide.defaults;
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final list = data['slides'] as List<dynamic>? ?? [];
      final slides = list.map((e) => HeroSlide.fromJson(e as Map<String, dynamic>)).toList();
      slides.sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
      return slides.isNotEmpty ? slides : HeroSlide.defaults;
    } catch (_) {
      return HeroSlide.defaults;
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

  Future<void> requestLoginOtp(String email, String password) async {
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

  String _errorMessage(http.Response res) {
    try {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['error'] as String? ?? 'Request failed (${res.statusCode})';
    } catch (_) {
      return 'Request failed (${res.statusCode})';
    }
  }
}

class ApiException implements Exception {
  ApiException(this.message);
  final String message;

  @override
  String toString() => message;
}

final apiClientProvider = ApiClient();
