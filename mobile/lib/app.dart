import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'config/theme.dart';
import 'i18n/languages.dart';
import 'providers/locale_provider.dart';
import 'providers/notifications_provider.dart';
import 'router/app_router.dart';
import 'services/auth_service.dart';
import 'services/system_notifications.dart';

class OneSourceApp extends ConsumerStatefulWidget {
  const OneSourceApp({super.key});

  @override
  ConsumerState<OneSourceApp> createState() => _OneSourceAppState();
}

class _OneSourceAppState extends ConsumerState<OneSourceApp>
    with WidgetsBindingObserver {
  late final ThemeData _theme = buildAppTheme();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    onSupabaseInitialized = () {
      if (mounted) {
        ref.read(supabaseReadyProvider.notifier).state = isSupabaseReady;
      }
    };
    // Defer auth init until after the first frame so the UI appears immediately.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(_initSupabase());
      SystemNotifications.onTap = (payload) {
        final router = ref.read(routerProvider);
        final path = (payload == null || payload.isEmpty)
            ? '/notifications'
            : (payload.startsWith('/') ? payload : '/$payload');
        if (path.startsWith('http')) {
          router.push('/notifications');
        } else {
          router.push(path);
        }
      };
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(
        ref.read(notificationsProvider.notifier).refresh(surfaceBanners: true, quiet: true),
      );
    }
  }

  Future<void> _initSupabase() async {
    if (isSupabaseReady) return;
    debugPrint('[OneSource] Supabase init starting (background)…');
    try {
      await initializeSupabase().timeout(const Duration(seconds: 20));
      debugPrint('[OneSource] Supabase init OK');
    } catch (e, stack) {
      debugPrint('[OneSource] Supabase init failed: $e\n$stack');
    }
    if (mounted) {
      ref.read(supabaseReadyProvider.notifier).state = isSupabaseReady;
    }
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);
    final language = ref.watch(localeProvider);

    return MaterialApp.router(
      title: 'One Source',
      debugShowCheckedModeBanner: false,
      theme: _theme,
      themeMode: ThemeMode.light,
      locale: Locale(languageCodeLabel(language)),
      routerConfig: router,
    );
  }
}
