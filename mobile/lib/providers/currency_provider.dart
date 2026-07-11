import 'package:flutter_riverpod/flutter_riverpod.dart';

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

class CurrencyNotifier extends Notifier<CurrencyState> {
  @override
  CurrencyState build() {
    Future.microtask(_init);
    return CurrencyState(currency: CurrencyCode.ugx, rates: fallbackRates, loading: true);
  }

  Future<void> _init() async {
    final saved = await loadSavedCurrency();
    state = state.copyWith(currency: saved, clearError: true);
    await refreshRates();
  }

  Future<void> setCurrency(CurrencyCode code) async {
    state = state.copyWith(currency: code);
    await saveCurrency(code);
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
