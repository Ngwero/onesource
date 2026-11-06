import 'package:flutter/foundation.dart';

import '../config/env.dart';

/// Optional Sentry — no-op when [Env.sentryDsn] is empty.
/// Add `sentry_flutter` to pubspec and uncomment the init body when ready.
Future<void> initSentryIfConfigured() async {
  if (Env.sentryDsn.isEmpty) return;
  debugPrint(
    '[OneSource] SENTRY_DSN set — install sentry_flutter and wire SentryFlutter.init to enable.',
  );
}