import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../config/env.dart';

/// Mirrors GET /api/features. UI should hide surfaces when the flag is off.
class FeatureFlags {
  FeatureFlags._(this._flags);

  final Map<String, bool> _flags;

  static FeatureFlags _cached = FeatureFlags._(const {});
  static DateTime? _fetchedAt;

  bool enabled(String key) {
    final aliases = <String, List<String>>{
      'timedDeals': ['timedDeals', 'deals'],
      'supportChat': ['supportChat', 'chat'],
      'pushNotifications': ['pushNotifications', 'push'],
    };
    for (final k in aliases[key] ?? [key]) {
      if (_flags[k] == true) return true;
    }
    return _flags[key] == true;
  }

  static FeatureFlags get current => _cached;

  static Future<FeatureFlags> load({bool force = false}) async {
    if (!force &&
        _fetchedAt != null &&
        DateTime.now().difference(_fetchedAt!) < const Duration(minutes: 1)) {
      return _cached;
    }
    try {
      final uri = Uri.parse(
        '${Env.apiBaseUrl.replaceAll(RegExp(r'/$'), '')}/features',
      );
      final res = await http.get(uri).timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        final raw = body['flags'];
        final map = <String, bool>{};
        if (raw is Map) {
          raw.forEach((k, v) {
            map[k.toString()] = v == true;
          });
        }
        _cached = FeatureFlags._(map);
        _fetchedAt = DateTime.now();
      }
    } catch (e) {
      debugPrint('[FeatureFlags] $e');
    }
    return _cached;
  }
}
