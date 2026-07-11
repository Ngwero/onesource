import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'currencies.dart';

const _apiUrl = 'https://open.er-api.com/v6/latest/UGX';
const _cacheTtlMs = 60 * 60 * 1000;

class RatesCache {
  RatesCache({required this.rates, required this.updatedAt, required this.fetchedAt});

  final Map<CurrencyCode, double> rates;
  final String updatedAt;
  final int fetchedAt;

  Map<String, dynamic> toJson() => {
        'rates': rates.map((k, v) => MapEntry(currencyCodeLabel(k), v)),
        'updatedAt': updatedAt,
        'fetchedAt': fetchedAt,
      };

  factory RatesCache.fromJson(Map<String, dynamic> json) {
    final rawRates = json['rates'] as Map<String, dynamic>? ?? {};
    final rates = <CurrencyCode, double>{...fallbackRates};
    for (final code in CurrencyCode.values) {
      final value = rawRates[currencyCodeLabel(code)];
      if (value is num) rates[code] = value.toDouble();
    }
    return RatesCache(
      rates: rates,
      updatedAt: json['updatedAt'] as String? ?? '',
      fetchedAt: json['fetchedAt'] as int? ?? 0,
    );
  }
}

Future<RatesCache> fetchLiveRates() async {
  final prefs = await SharedPreferences.getInstance();
  final cachedRaw = prefs.getString(ratesCacheKey);
  if (cachedRaw != null) {
    try {
      final cached = RatesCache.fromJson(jsonDecode(cachedRaw) as Map<String, dynamic>);
      if (DateTime.now().millisecondsSinceEpoch - cached.fetchedAt < _cacheTtlMs) {
        return cached;
      }
    } catch (_) {}
  }

  try {
    final res = await http.get(Uri.parse(_apiUrl)).timeout(const Duration(seconds: 12));
    if (res.statusCode != 200) throw Exception('HTTP ${res.statusCode}');
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (data['result'] != 'success') throw Exception('API error');

    final apiRates = data['rates'] as Map<String, dynamic>? ?? {};
    final rates = <CurrencyCode, double>{...fallbackRates};
    for (final code in CurrencyCode.values) {
      final value = apiRates[currencyCodeLabel(code)];
      if (value is num) rates[code] = value.toDouble();
    }

    final cache = RatesCache(
      rates: rates,
      updatedAt: data['time_last_update_utc'] as String? ?? DateTime.now().toUtc().toString(),
      fetchedAt: DateTime.now().millisecondsSinceEpoch,
    );
    await prefs.setString(ratesCacheKey, jsonEncode(cache.toJson()));
    return cache;
  } catch (_) {
    if (cachedRaw != null) {
      try {
        return RatesCache.fromJson(jsonDecode(cachedRaw) as Map<String, dynamic>);
      } catch (_) {}
    }
    return RatesCache(
      rates: fallbackRates,
      updatedAt: DateTime.now().toUtc().toString(),
      fetchedAt: DateTime.now().millisecondsSinceEpoch,
    );
  }
}

Future<CurrencyCode> loadSavedCurrency() async {
  final prefs = await SharedPreferences.getInstance();
  return currencyCodeFromString(prefs.getString(currencyStorageKey));
}

Future<void> saveCurrency(CurrencyCode code) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(currencyStorageKey, currencyCodeLabel(code));
}
