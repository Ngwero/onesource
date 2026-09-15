import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../config/theme.dart';
import '../providers/notifications_provider.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  void _openLink(BuildContext context, String href) {
    final path = href.trim();
    if (path.isEmpty) return;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return;
    }
    final route = path.startsWith('/') ? path : '/$path';
    context.push(route);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(notificationsProvider);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (state.unreadCount > 0)
            TextButton(
              onPressed: () =>
                  ref.read(notificationsProvider.notifier).markAllRead(),
              child: const Text('Mark all read'),
            ),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.leaf,
        onRefresh: () => ref.read(notificationsProvider.notifier).refresh(),
        child: state.isLoading && state.items.isEmpty
            ? ListView(
                children: const [
                  SizedBox(height: 120),
                  Center(child: CircularProgressIndicator(color: AppColors.leaf)),
                ],
              )
            : state.items.isEmpty
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      SizedBox(height: MediaQuery.sizeOf(context).height * 0.25),
                      Icon(
                        Icons.notifications_none_rounded,
                        size: 56,
                        color: AppColors.textMuted.withValues(alpha: 0.5),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'No notifications yet',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: AppColors.text,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 40),
                        child: Text(
                          'Offers and updates from One Source will show up here.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: AppColors.textMuted),
                        ),
                      ),
                    ],
                  )
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                    itemCount: state.items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final n = state.items[index];
                      final unread = !state.isRead(n.id);
                      final when = n.createdAt != null
                          ? DateFormat('d MMM · HH:mm').format(n.createdAt!.toLocal())
                          : '';
                      return Material(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(16),
                          onTap: () async {
                            await ref
                                .read(notificationsProvider.notifier)
                                .markRead(n.id);
                            if (!context.mounted) return;
                            if (n.href.isNotEmpty) {
                              _openLink(context, n.href);
                            }
                          },
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: 42,
                                  height: 42,
                                  decoration: BoxDecoration(
                                    color: unread
                                        ? AppColors.lemonGreen.withValues(alpha: 0.35)
                                        : AppColors.canvas,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    Icons.notifications_rounded,
                                    color: unread
                                        ? AppColors.darkGreen
                                        : AppColors.textMuted,
                                    size: 22,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: Text(
                                              n.title,
                                              style: TextStyle(
                                                fontSize: 15,
                                                fontWeight: unread
                                                    ? FontWeight.w800
                                                    : FontWeight.w600,
                                                color: AppColors.text,
                                              ),
                                            ),
                                          ),
                                          if (unread)
                                            Container(
                                              width: 8,
                                              height: 8,
                                              decoration: const BoxDecoration(
                                                color: AppColors.leaf,
                                                shape: BoxShape.circle,
                                              ),
                                            ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        n.body,
                                        style: const TextStyle(
                                          fontSize: 13.5,
                                          height: 1.35,
                                          color: AppColors.textMuted,
                                        ),
                                      ),
                                      if (when.isNotEmpty) ...[
                                        const SizedBox(height: 8),
                                        Text(
                                          when,
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: AppColors.textMuted
                                                .withValues(alpha: 0.85),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
