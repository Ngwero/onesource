import 'dart:ui' show PlatformDispatcher;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';

/// Synchronous on purpose. On a physical iPhone the asset and plugin
/// channels are not serviced until the Flutter view is attached, which
/// happens inside [runApp]. Awaiting them here (i18n, Supabase, permissions)
/// stalls the same run loop that would fire [Future.timeout], so the native
/// launch screen — the same dark green as the Flutter splash — never leaves.
void main() {
  WidgetsFlutterBinding.ensureInitialized();

  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    debugPrint('FlutterError: ${details.exceptionAsString()}');
  };

  PlatformDispatcher.instance.onError = (error, stack) {
    debugPrint('Uncaught error: $error\n$stack');
    return true;
  };

  // Exists even if the first frame is late or the splash element is disposed.
  SplashDeadline.arm();
  debugPrint('[OneSource] main() — launching app');
  runApp(const ProviderScope(child: OneSourceApp()));
}
