import 'dart:convert';
import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config/env.dart';

class AppUpdateInfo {
  const AppUpdateInfo({
    required this.current,
    required this.latest,
    required this.storeUrl,
    required this.forced,
  });

  final String current;
  final String latest;
  final String storeUrl;

  /// Below the minimum supported version — the prompt cannot be dismissed.
  final bool forced;
}

const _dismissedKey = 'app-update-dismissed';
const _remindAfter = Duration(days: 3);

int compareVersions(String a, String b) {
  List<int> parts(String v) =>
      v.split(RegExp(r'[.+]')).take(3).map((p) => int.tryParse(p) ?? 0).toList();
  final pa = parts(a);
  final pb = parts(b);
  for (var i = 0; i < 3; i++) {
    final diff = (i < pa.length ? pa[i] : 0) - (i < pb.length ? pb[i] : 0);
    if (diff != 0) return diff;
  }
  return 0;
}

/// Returns update details when the store has a newer build than this one.
Future<AppUpdateInfo?> checkForAppUpdate() async {
  if (kIsWeb || !(Platform.isIOS || Platform.isAndroid)) return null;
  try {
    final info = await PackageInfo.fromPlatform();
    final res = await http
        .get(Uri.parse('${Env.apiBaseUrl}/app-version'))
        .timeout(const Duration(seconds: 6));
    if (res.statusCode != 200) return null;
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    final platform = body[Platform.isIOS ? 'ios' : 'android'] as Map<String, dynamic>?;
    if (platform == null) return null;

    final current = info.version;
    final latest = platform['latest'] as String? ?? current;
    final minimum = platform['minimum'] as String? ?? '0.0.0';
    final url = platform['url'] as String? ?? '';
    if (url.isEmpty || compareVersions(current, latest) >= 0) return null;

    final forced = compareVersions(current, minimum) < 0;
    if (!forced && await _recentlyDismissed(latest)) return null;
    return AppUpdateInfo(current: current, latest: latest, storeUrl: url, forced: forced);
  } catch (e) {
    debugPrint('[OneSource] update check failed: $e');
    return null;
  }
}

Future<bool> _recentlyDismissed(String latest) async {
  final prefs = await SharedPreferences.getInstance();
  final raw = prefs.getString(_dismissedKey);
  if (raw == null) return false;
  final parts = raw.split('|');
  if (parts.length != 2 || parts[0] != latest) return false;
  final at = DateTime.fromMillisecondsSinceEpoch(int.tryParse(parts[1]) ?? 0);
  return DateTime.now().difference(at) < _remindAfter;
}

Future<void> rememberUpdateDismissed(String latest) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(_dismissedKey, '$latest|${DateTime.now().millisecondsSinceEpoch}');
}
