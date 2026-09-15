import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/app_notification.dart';
import '../services/api_client.dart';

const _readIdsKey = 'onesource_notification_read_ids';

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
  @override
  NotificationsState build() {
    Future.microtask(refresh);
    return const NotificationsState(isLoading: true);
  }

  Future<void> refresh() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final prefs = await SharedPreferences.getInstance();
      final read = prefs.getStringList(_readIdsKey)?.toSet() ?? <String>{};
      final items = await apiClientProvider.fetchNotifications();
      final known = items.map((n) => n.id).toSet();
      final pruned = read.where(known.contains).toSet();
      if (pruned.length != read.length) {
        await prefs.setStringList(_readIdsKey, pruned.toList());
      }
      state = NotificationsState(items: items, readIds: pruned);
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
