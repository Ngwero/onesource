import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../i18n/country_defaults.dart';
import '../services/api_client.dart';
import 'currency_provider.dart';
import 'locale_provider.dart';

const _chosenKey = 'onesource.deliveryCountry';
const _detectedKey = 'onesource.detectedCountry';
const _detectedAtKey = 'onesource.detectedCountryAt';
const _redetectAfter = Duration(days: 1);

/// User's delivery country: their own choice, else detected from their IP
/// (re-checked at most daily), else Uganda. Detection only fills in currency
/// and language the user hasn't picked themselves.
class DeliveryCountryNotifier extends Notifier<String> {
  @override
  String build() {
    Future.microtask(_init);
    return defaultDeliveryCountry;
  }

  Future<void> _init() async {
    try {
      final prefs = await SharedPreferences.getInstance().timeout(const Duration(seconds: 2));
      final chosen = _read(prefs, _chosenKey);
      final detected = _read(prefs, _detectedKey);
      final stored = chosen ?? detected;
      if (stored != null) state = stored;
      if (chosen != null) return;

      final detectedAt = DateTime.tryParse(prefs.getString(_detectedAtKey) ?? '');
      if (detected != null &&
          detectedAt != null &&
          DateTime.now().difference(detectedAt) < _redetectAfter) {
        return;
      }

      final country = await apiClientProvider.fetchGeoCountry().timeout(const Duration(seconds: 4)) ??
          _deviceRegion();
      if (country == null || _read(prefs, _chosenKey) != null) return;
      await prefs.setString(_detectedKey, country).timeout(const Duration(seconds: 2));
      await prefs.setString(_detectedAtKey, DateTime.now().toIso8601String()).timeout(
            const Duration(seconds: 2),
          );
      state = country;
      await _applyDefaults(country, keepUserChoice: true).timeout(const Duration(seconds: 3));
    } catch (e) {
      debugPrint('[OneSource] delivery country init skipped: $e');
    }
  }

  Future<void> choose(String code) async {
    state = code;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_chosenKey, code);
    await _applyDefaults(code, keepUserChoice: false);
  }

  /// A manual country change resets currency and language; an auto-detected
  /// one leaves anything the user picked in the switchers alone.
  Future<void> _applyDefaults(String country, {required bool keepUserChoice}) async {
    final defaults = countryDefaults(country);
    await Future.wait([
      ref
          .read(currencyProvider.notifier)
          .applyCountryDefault(defaults.currency, keepUserChoice: keepUserChoice),
      ref
          .read(localeProvider.notifier)
          .applyCountryDefault(defaults.language, keepUserChoice: keepUserChoice),
    ]);
  }

  static String? _read(SharedPreferences prefs, String key) {
    final value = prefs.getString(key);
    return isCountryCode(value) ? value : null;
  }

  static String? _deviceRegion() {
    for (final locale in PlatformDispatcher.instance.locales) {
      final region = locale.countryCode?.toUpperCase();
      if (isCountryCode(region)) return region;
    }
    return null;
  }
}

final deliveryCountryProvider =
    NotifierProvider<DeliveryCountryNotifier, String>(DeliveryCountryNotifier.new);
