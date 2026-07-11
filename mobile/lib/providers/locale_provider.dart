import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../i18n/languages.dart';

class LocaleNotifier extends Notifier<LanguageCode> {
  @override
  LanguageCode build() {
    Future.microtask(_loadSaved);
    return defaultLanguage;
  }

  Future<void> _loadSaved() async {
    final prefs = await SharedPreferences.getInstance();
    state = languageCodeFromString(prefs.getString(languageStorageKey));
  }

  Future<void> setLanguage(LanguageCode code) async {
    state = code;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(languageStorageKey, languageCodeLabel(code));
  }
}

final localeProvider = NotifierProvider<LocaleNotifier, LanguageCode>(LocaleNotifier.new);
