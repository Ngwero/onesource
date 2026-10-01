import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/cart_item.dart';
import '../models/product.dart';

const _cartKey = 'onesource_cart_v1';

class CartNotifier extends StateNotifier<List<CartItem>> {
  CartNotifier() : super(const []) {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_cartKey);
    if (raw == null) return;
    try {
      final list = jsonDecode(raw) as List<dynamic>;
      final restored = <CartItem>[];
      final pending = <Map<String, dynamic>>[];
      for (final entry in list.cast<Map<String, dynamic>>()) {
        final snapshot = entry['product'];
        final qty = entry['quantity'] as int? ?? 0;
        if (snapshot is Map<String, dynamic> && qty > 0) {
          restored.add(CartItem(product: Product.fromJson(snapshot), quantity: qty));
        } else {
          // Older entries without a snapshot wait for the product to load.
          pending.add(entry);
        }
      }
      _pendingRestore = pending;
      if (restored.isNotEmpty && state.isEmpty) state = restored;
    } catch (_) {}
  }

  List<Map<String, dynamic>> _pendingRestore = [];

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
    final data = state.map((i) => i.toJson()).toList();
    await prefs.setString(_cartKey, jsonEncode(data));
  }

  int quantityFor(String productId) {
    return state
        .where((i) => i.product.id == productId)
        .fold(0, (sum, i) => sum + i.quantity);
  }

  void add(Product product, {int quantity = 1}) {
    final max = product.stockQuantity ?? 99;
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
  return ref.watch(cartProvider.notifier).subtotal;
});

final cartItemCountProvider = Provider<int>((ref) {
  return ref.watch(cartProvider.notifier).itemCount;
});
