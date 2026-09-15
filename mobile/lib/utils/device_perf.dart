import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;

/// True on Android where continuous GPU animations are costlier / less stable.
bool get reduceMotionForDevice {
  if (kIsWeb) return false;
  try {
    return Platform.isAndroid;
  } catch (_) {
    return false;
  }
}
