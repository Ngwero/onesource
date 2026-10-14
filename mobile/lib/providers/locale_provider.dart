import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../i18n/languages.dart';

/// "user" = picked in the switcher; "auto" = derived from the delivery country.
const _languageSourceKey = 'onesource.languageSource';

class LocaleNotifier extends Notifier<LanguageCode> {
  /// Completes once the saved language has been loaded.
  late Future<void> ready;

  @override
  LanguageCode build() {
    ready = Future.microtask(_loadSaved);
    return defaultLanguage;
  }

  Future<void> _loadSaved() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(languageStorageKey);
    // Values saved before sources were tracked could only come from the switcher.
    if (prefs.getString(_languageSourceKey) == null && saved != null) {
      await prefs.setString(_languageSourceKey, 'user');
    }
    state = languageCodeFromString(saved);
  }

  Future<void> setLanguage(LanguageCode code, {bool byUser = true}) async {
    state = code;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(languageStorageKey, languageCodeLabel(code));
    await prefs.setString(_languageSourceKey, byUser ? 'user' : 'auto');
  }

  /// Switch to a delivery country's language. With [keepUserChoice] a
  /// language the user picked in the switcher is left alone.
  Future<void> applyCountryDefault(LanguageCode code, {required bool keepUserChoice}) async {
    await ready;
    final prefs = await SharedPreferences.getInstance();
    if (keepUserChoice && prefs.getString(_languageSourceKey) == 'user') return;
    await setLanguage(code, byUser: false);
  }
}

final localeProvider = NotifierProvider<LocaleNotifier, LanguageCode>(LocaleNotifier.new);
