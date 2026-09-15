import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Shows OS-level banners at the top of the phone for dashboard messages.
class SystemNotifications {
  SystemNotifications._();

  static final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  static const _channelId = 'onesource_alerts';
  static const _channelName = 'One Source alerts';
  static const _channelDesc = 'Offers and updates from One Source';

  static bool _ready = false;
  static void Function(String? payload)? onTap;

  static Future<void> init({void Function(String? payload)? onNotificationTap}) async {
    if (_ready) return;
    onTap = onNotificationTap ?? onTap;

    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosInit = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
      defaultPresentAlert: true,
      defaultPresentBadge: true,
      defaultPresentSound: true,
      defaultPresentBanner: true,
      defaultPresentList: true,
    );

    await _plugin.initialize(
      const InitializationSettings(android: androidInit, iOS: iosInit),
      onDidReceiveNotificationResponse: (response) {
        onTap?.call(response.payload);
      },
    );

    final granted = await requestPermission();
    debugPrint('[OneSource] notification permission granted=$granted');
    _ready = true;
  }

  static Future<bool> requestPermission() async {
    if (Platform.isAndroid) {
      final android = _plugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      final granted = await android?.requestNotificationsPermission();
      return granted ?? true;
    }
    if (Platform.isIOS) {
      final ios = _plugin.resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin>();
      final granted = await ios?.requestPermissions(
        alert: true,
        badge: true,
        sound: true,
      );
      return granted ?? false;
    }
    return true;
  }

  static int _stableId(String id) {
    var hash = 0;
    for (final c in id.codeUnits) {
      hash = (hash * 31 + c) & 0x7fffffff;
    }
    return hash == 0 ? 1 : hash;
  }

  /// Heads-up / banner at the top of the phone.
  static Future<void> showBanner({
    required String id,
    required String title,
    required String body,
    String? payload,
  }) async {
    if (!_ready) {
      await init();
    }

    final android = AndroidNotificationDetails(
      _channelId,
      _channelName,
      channelDescription: _channelDesc,
      importance: Importance.max,
      priority: Priority.high,
      ticker: title,
      styleInformation: BigTextStyleInformation(body, contentTitle: title),
      playSound: true,
      enableVibration: true,
    );

    // Avoid InterruptionLevel.timeSensitive — needs an Apple entitlement.
    const ios = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
      presentBanner: true,
      presentList: true,
      interruptionLevel: InterruptionLevel.active,
    );

    try {
      await _plugin.show(
        _stableId(id),
        title,
        body,
        NotificationDetails(android: android, iOS: ios),
        payload: payload ?? id,
      );
      debugPrint('[OneSource] showed system banner id=$id');
    } catch (e) {
      debugPrint('[OneSource] system notification failed: $e');
    }
  }
}
