import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../currency/currencies.dart';
import '../currency/format_price.dart';
import '../currency/rates_service.dart';

class CurrencyState {
  const CurrencyState({
    required this.currency,
    required this.rates,
    this.updatedAt,
    this.loading = false,
    this.error,
  });

  final CurrencyCode currency;
  final Map<CurrencyCode, double> rates;
  final String? updatedAt;
  final bool loading;
  final Object? error;

  double convert(num amountUgx) => convertAmount(
        currency: currency,
        rates: rates,
        amountUgx: amountUgx,
      );

  double get freeDeliveryThreshold => convert(freeDeliveryThresholdUgx);

  String formatPrice(num amountUgx) => formatConvertedPrice(
        currency: currency,
        rates: rates,
        amountUgx: amountUgx,
      );

  CurrencyState copyWith({
    CurrencyCode? currency,
    Map<CurrencyCode, double>? rates,
    String? updatedAt,
    bool? loading,
    Object? error,
    bool clearError = false,
  }) {
    return CurrencyState(
      currency: currency ?? this.currency,
      rates: rates ?? this.rates,
      updatedAt: updatedAt ?? this.updatedAt,
      loading: loading ?? this.loading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

/// "user" = picked in the switcher; "auto" = derived from the delivery country.
const _currencySourceKey = 'onesource.currencySource';

class CurrencyNotifier extends Notifier<CurrencyState> {
  /// Completes once the saved currency has been loaded.
  late Future<void> ready;

  @override
  CurrencyState build() {
    ready = Future.microtask(_loadSaved);
    return CurrencyState(currency: defaultCurrency, rates: fallbackRates, loading: true);
  }

  Future<void> _loadSaved() async {
    final prefs = await SharedPreferences.getInstance();
    // Values saved before sources were tracked could only come from the switcher.
    if (prefs.getString(_currencySourceKey) == null && prefs.getString(currencyStorageKey) != null) {
      await prefs.setString(_currencySourceKey, 'user');
    }
    final saved = await loadSavedCurrency();
    state = state.copyWith(currency: saved, clearError: true);
    unawaited(refreshRates());
  }

  Future<void> setCurrency(CurrencyCode code, {bool byUser = true}) async {
    state = state.copyWith(currency: code);
    await saveCurrency(code);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_currencySourceKey, byUser ? 'user' : 'auto');
  }

  /// Switch to a delivery country's currency. With [keepUserChoice] a
  /// currency the user picked in the switcher is left alone.
  Future<void> applyCountryDefault(CurrencyCode code, {required bool keepUserChoice}) async {
    await ready;
    final prefs = await SharedPreferences.getInstance();
    if (keepUserChoice && prefs.getString(_currencySourceKey) == 'user') return;
    await setCurrency(code, byUser: false);
  }

  Future<void> refreshRates() async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final cache = await fetchLiveRates();
      state = state.copyWith(
        rates: cache.rates,
        updatedAt: cache.updatedAt,
        loading: false,
        clearError: true,
      );
    } catch (e) {
      state = state.copyWith(loading: false, error: e);
    }
  }
}

final currencyProvider = NotifierProvider<CurrencyNotifier, CurrencyState>(CurrencyNotifier.new);

final formatPriceProvider = Provider<String Function(double)>((ref) {
  final currency = ref.watch(currencyProvider);
  return currency.formatPrice;
});
