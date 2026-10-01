import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart' show rootBundle;

import 'languages.dart';

/// Translation bundles shared with the website (`assets/i18n/*.json`,
/// synced by `npm run i18n:mobile`), flattened to dotted keys.
class I18nCatalog {
  I18nCatalog._();

  static final Map<LanguageCode, Map<String, String>> _bundles = {};
  static final Map<LanguageCode, Map<String, String>> _phrases = {};
  static final Map<LanguageCode, List<(RegExp, String)>> _rules = {};
  static bool _loaded = false;

  static bool get isLoaded => _loaded;

  static Future<void> load() async {
    if (_loaded) return;
    await Future.wait([
      for (final lang in LanguageCode.values) _loadLanguage(lang),
      _loadProductRules(),
    ]);
    _loaded = true;
  }

  static Future<void> _loadLanguage(LanguageCode lang) async {
    try {
      final raw = await rootBundle.loadString('assets/i18n/${lang.name}.json');
      final flat = <String, String>{};
      _flatten(jsonDecode(raw), '', flat);
      _bundles[lang] = flat;
    } catch (e) {
      debugPrint('[i18n] failed to load ${lang.name}: $e');
    }
  }

  static Future<void> _loadProductRules() async {
    try {
      final raw = await rootBundle.loadString('assets/i18n/product_rules.json');
      final json = jsonDecode(raw) as Map<String, dynamic>;
      final phrases = (json['phrases'] as Map<String, dynamic>? ?? {});
      for (final entry in phrases.entries) {
        final byLang = entry.value as Map<String, dynamic>;
        for (final l in byLang.entries) {
          final lang = languageCodeFromString(l.key);
          (_phrases[lang] ??= {})[entry.key] = l.value as String;
        }
      }
      final rules = (json['rules'] as Map<String, dynamic>? ?? {});
      for (final entry in rules.entries) {
        final lang = languageCodeFromString(entry.key);
        _rules[lang] = [
          for (final r in entry.value as List)
            (RegExp(r[0] as String, caseSensitive: false), r[1] as String),
        ];
      }
    } catch (e) {
      debugPrint('[i18n] failed to load product rules: $e');
    }
  }

  static void _flatten(Object? node, String prefix, Map<String, String> out) {
    if (node is Map) {
      node.forEach((k, v) {
        _flatten(v, prefix.isEmpty ? '$k' : '$prefix.$k', out);
      });
    } else if (node is String) {
      out[prefix] = node;
    } else if (node is num || node is bool) {
      out[prefix] = '$node';
    }
  }

  static String? lookup(LanguageCode lang, String key) => _bundles[lang]?[key];

  /// Word/phrase rules used for product title segments with no glossary entry.
  static String applyProductTermRules(String segment, LanguageCode lang) {
    final trimmed = segment.trim();
    if (trimmed.isEmpty || lang == LanguageCode.en) return trimmed;
    final common = _phrases[lang]?[trimmed];
    if (common != null) return common;
    var out = trimmed;
    for (final (re, repl) in _rules[lang] ?? const <(RegExp, String)>[]) {
      out = out.replaceAll(re, repl);
    }
    return out;
  }
}
