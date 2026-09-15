import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/app_notification.dart';
import '../services/api_client.dart';
import '../services/system_notifications.dart';

const _readIdsKey = 'onesource_notification_read_ids';
const _surfacedIdsKey = 'onesource_notification_surfaced_ids';

class NotificationsState {
  const NotificationsState({
    this.items = const [],
    this.readIds = const {},
    this.isLoading = false,
    this.error,
  });

  final List<AppNotification> items;
  final Set<String> readIds;
  final bool isLoading;
  final Object? error;

  int get unreadCount => items.where((n) => !readIds.contains(n.id)).length;

  bool isRead(String id) => readIds.contains(id);

  NotificationsState copyWith({
    List<AppNotification>? items,
    Set<String>? readIds,
    bool? isLoading,
    Object? error,
    bool clearError = false,
  }) {
    return NotificationsState(
      items: items ?? this.items,
      readIds: readIds ?? this.readIds,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class NotificationsNotifier extends Notifier<NotificationsState> {
  Timer? _poll;

  @override
  NotificationsState build() {
    ref.onDispose(() => _poll?.cancel());
    Future.microtask(() async {
      await SystemNotifications.init();
      await refresh(surfaceBanners: true);
      _poll?.cancel();
      _poll = Timer.periodic(const Duration(seconds: 20), (_) {
        unawaited(refresh(surfaceBanners: true, quiet: true));
      });
    });
    return const NotificationsState(isLoading: true);
  }

  Future<void> refresh({
    bool surfaceBanners = false,
    bool quiet = false,
  }) async {
    if (!quiet) {
      state = state.copyWith(isLoading: true, clearError: true);
    }
    try {
      final prefs = await SharedPreferences.getInstance();
      final read = prefs.getStringList(_readIdsKey)?.toSet() ?? <String>{};
      var surfaced =
          prefs.getStringList(_surfacedIdsKey)?.toSet() ?? <String>{};
      final items = await apiClientProvider.fetchNotifications();
      final known = items.map((n) => n.id).toSet();
      final prunedRead = read.where(known.contains).toSet();
      if (prunedRead.length != read.length) {
        await prefs.setStringList(_readIdsKey, prunedRead.toList());
      }

      if (surfaceBanners) {
        // First sync: baseline without flooding the notification shade.
        if (surfaced.isEmpty && items.isNotEmpty) {
          surfaced = known;
          await prefs.setStringList(_surfacedIdsKey, surfaced.toList());
        } else {
          final fresh = items.where((n) => !surfaced.contains(n.id)).toList();
          for (final n in fresh) {
            await SystemNotifications.showBanner(
              id: n.id,
              title: n.title,
              body: n.body,
              payload: n.href.isNotEmpty ? n.href : '/notifications',
            );
            surfaced.add(n.id);
          }
          if (fresh.isNotEmpty) {
            await prefs.setStringList(_surfacedIdsKey, surfaced.toList());
          }
        }
      }

      state = NotificationsState(items: items, readIds: prunedRead);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e);
    }
  }

  Future<void> markRead(String id) async {
    if (state.readIds.contains(id)) return;
    final next = {...state.readIds, id};
    state = state.copyWith(readIds: next);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_readIdsKey, next.toList());
  }

  Future<void> markAllRead() async {
    final next = state.items.map((n) => n.id).toSet();
    state = state.copyWith(readIds: next);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_readIdsKey, next.toList());
  }
}

final notificationsProvider =
    NotifierProvider<NotificationsNotifier, NotificationsState>(
  NotificationsNotifier.new,
);

final unreadNotificationCountProvider = Provider<int>((ref) {
  return ref.watch(notificationsProvider).unreadCount;
});
