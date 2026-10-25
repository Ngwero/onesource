import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/cart_item.dart';
import '../models/product.dart';
import '../services/api_client.dart';

const _cartKey = 'onesource_cart_v1';

class CartNotifier extends StateNotifier<List<CartItem>> {
  CartNotifier({ApiClient? api}) : _api = api, super(const []) {
    _load();
  }

  final ApiClient? _api;

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_cartKey);
    if (raw == null) return;
    try {
      final list = jsonDecode(raw) as List<dynamic>;
      final restored = <CartItem>[];
      final pending = <Map<String, dynamic>>[];
      final ids = <String>[];
      for (final entry in list.cast<Map<String, dynamic>>()) {
        final qty = entry['quantity'] as int? ?? 0;
        if (qty <= 0) continue;
        final snapshot = entry['product'];
        final productId = (entry['productId'] as String?) ??
            (snapshot is Map<String, dynamic> ? snapshot['id'] as String? : null);
        if (productId == null || productId.isEmpty) continue;
        ids.add(productId);
        if (snapshot is Map<String, dynamic>) {
          restored.add(
            CartItem(product: Product.fromJson(snapshot), quantity: qty),
          );
        } else {
          pending.add({'productId': productId, 'quantity': qty});
        }
      }
      _pendingRestore = pending;
      if (restored.isNotEmpty && state.isEmpty) state = restored;
      await _refreshFromApi(ids);
    } catch (_) {}
  }

  List<Map<String, dynamic>> _pendingRestore = [];

  Future<void> _refreshFromApi(List<String> ids) async {
    if (ids.isEmpty) return;
    final client = _api ?? ApiClient();
    final live = <CartItem>[];
    for (final id in ids) {
      final existingQty = state
          .where((item) => item.product.id == id)
          .fold(0, (sum, item) => sum + item.quantity);
      final pendingQty = _pendingRestore
          .where((entry) => entry['productId'] == id)
          .fold(0, (sum, entry) => sum + ((entry['quantity'] as int?) ?? 0));
      final qty = existingQty > 0 ? existingQty : pendingQty;
      if (qty <= 0) continue;
      try {
        final product = await client.fetchProductById(id);
        if (product == null || !product.inStock) continue;
        final max = product.stockQuantity ?? 99;
        live.add(CartItem(product: product, quantity: qty.clamp(1, max)));
      } catch (_) {}
    }
    if (live.isNotEmpty) {
      state = live;
      _pendingRestore = [];
    }
  }

  void restoreFromProducts(List<Product> products) {
    if (_pendingRestore.isEmpty) return;
    final byId = {for (final p in products) p.id: p};
    final restored = <CartItem>[];
    for (final entry in _pendingRestore) {
      final productId = entry['productId'] as String?;
      final qty = entry['quantity'] as int? ?? 0;
      final product = productId != null ? byId[productId] : null;
      if (product != null && qty > 0) {
        restored.add(CartItem(product: product, quantity: qty));
      }
    }
    _pendingRestore = [];
    if (restored.isNotEmpty) {
      final have = state.map((i) => i.product.id).toSet();
      state = [...state, ...restored.where((i) => !have.contains(i.product.id))];
    }
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    final data = state
        .map((i) => {'productId': i.product.id, 'quantity': i.quantity})
        .toList();
    await prefs.setString(_cartKey, jsonEncode(data));
  }

  int quantityFor(String productId) {
    return state
        .where((i) => i.product.id == productId)
        .fold(0, (sum, i) => i.quantity + sum);
  }

  void add(Product product, {int quantity = 1}) {
    final max = product.stockQuantity ?? 99;
    if (!product.inStock || max <= 0 || quantity <= 0) return;
    final existing = state.indexWhere((i) => i.product.id == product.id);
    if (existing >= 0) {
      final next = (state[existing].quantity + quantity).clamp(1, max);
      final updated = [...state];
      updated[existing] = state[existing].copyWith(quantity: next);
      state = updated;
    } else {
      state = [...state, CartItem(product: product, quantity: quantity.clamp(1, max))];
    }
    _persist();
  }

  void setQuantity(String productId, int quantity) {
    if (quantity <= 0) {
      remove(productId);
      return;
    }
    state = state
        .map((i) {
          if (i.product.id != productId) return i;
          final max = i.product.stockQuantity ?? 99;
          if (!i.product.inStock || max <= 0) return i;
          return i.copyWith(quantity: quantity.clamp(1, max));
        })
        .toList();
    _persist();
  }

  void remove(String productId) {
    state = state.where((i) => i.product.id != productId).toList();
    _persist();
  }

  void clear() {
    state = [];
    _persist();
  }

  double get subtotal => state.fold(0, (sum, i) => sum + i.lineTotal);

  int get itemCount => state.fold(0, (sum, i) => sum + i.quantity);
}

final cartProvider = StateNotifierProvider<CartNotifier, List<CartItem>>((ref) {
  return CartNotifier();
});

final cartSubtotalProvider = Provider<double>((ref) {
  return ref.watch(cartProvider).fold(0.0, (sum, item) => sum + item.lineTotal);
});

final cartItemCountProvider = Provider<int>((ref) {
  return ref.watch(cartProvider).fold(0, (sum, item) => sum + item.quantity);
});
