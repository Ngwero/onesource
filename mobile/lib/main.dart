import 'dart:async';
import 'dart:ui' show PlatformDispatcher;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'i18n/i18n_catalog.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    debugPrint('FlutterError: ${details.exceptionAsString()}');
  };

  PlatformDispatcher.instance.onError = (error, stack) {
    debugPrint('Uncaught error: $error\n$stack');
    return true;
  };

  // Asset reads go through a platform channel. On a physical iPhone that
  // channel can stall (debug asset server, a plugin that never answers).
  // A short timeout keeps the native launch screen from sitting there forever.
  try {
    await I18nCatalog.load().timeout(const Duration(milliseconds: 800));
    debugPrint('[OneSource] i18n ready');
  } catch (e) {
    debugPrint('[OneSource] i18n not ready before first frame: $e');
  }

  debugPrint('[OneSource] main() — launching app');
  runApp(const ProviderScope(child: OneSourceApp()));
}
