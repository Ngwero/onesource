import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/product.dart';
import '../services/auth_service.dart';

/// Product snapshots kept on device per user (guest when signed out),
/// newest first — used for Saved items and Browsing history.
class ProductListNotifier extends StateNotifier<List<Product>> {
  ProductListNotifier(this._prefix, this._userKey, {this.maxItems = 200}) : super(const []) {
    _load();
  }

  final String _prefix;
  final String _userKey;
  final int maxItems;

  String get _storageKey => '$_prefix$_userKey';

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    var items = _decode(prefs.getString(_storageKey));
    if (_userKey != 'guest') {
      // Keep anything saved before signing in.
      final guestKey = '${_prefix}guest';
      final guest = _decode(prefs.getString(guestKey));
      if (guest.isNotEmpty) {
        final seen = items.map((p) => p.id).toSet();
        items = [...items, ...guest.where((p) => seen.add(p.id))];
        await prefs.remove(guestKey);
      }
    }
    if (!mounted) return;
    state = items.take(maxItems).toList();
    if (_userKey != 'guest') await _persist();
  }

  List<Product> _decode(String? raw) {
    if (raw == null) return [];
    try {
      return (jsonDecode(raw) as List<dynamic>)
          .map((e) => Product.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_storageKey, jsonEncode(state.map((p) => p.toJson()).toList()));
  }

  bool contains(String productId) => state.any((p) => p.id == productId);

  /// Moves [product] to the front.
  void push(Product product) {
    state = [product, ...state.where((p) => p.id != product.id)].take(maxItems).toList();
    _persist();
  }

  void remove(String productId) {
    state = state.where((p) => p.id != productId).toList();
    _persist();
  }

  /// Returns true when the product is now in the list.
  bool toggle(Product product) {
    if (contains(product.id)) {
      remove(product.id);
      return false;
    }
    push(product);
    return true;
  }

  void clear() {
    state = const [];
    _persist();
  }
}

final _userKeyProvider = Provider<String>((ref) {
  final user = ref.watch(authStateProvider).value?.session?.user;
  return user?.id ?? 'guest';
});

final savedItemsProvider = StateNotifierProvider<ProductListNotifier, List<Product>>((ref) {
  return ProductListNotifier('os-saved-list:', ref.watch(_userKeyProvider));
});

final browsingHistoryProvider = StateNotifierProvider<ProductListNotifier, List<Product>>((ref) {
  return ProductListNotifier('os-browse-history:', ref.watch(_userKeyProvider), maxItems: 60);
});

final isSavedProvider = Provider.family<bool, String>((ref, productId) {
  return ref.watch(savedItemsProvider).any((p) => p.id == productId);
});
