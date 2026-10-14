import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'config/theme.dart';
import 'i18n/app_strings.dart';
import 'i18n/languages.dart';
import 'providers/delivery_country_provider.dart';
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
  Timer? _splashWatch;
  final DateTime _started = DateTime.now();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Starts IP country detection, which may set default currency and language.
    ref.read(deliveryCountryProvider);
    onSupabaseInitialized = () {
      if (mounted) {
        ref.read(supabaseReadyProvider.notifier).state = isSupabaseReady;
      }
    };
    // Lives on the app, not the splash element. Splash dispose, a failed
    // prefs read, or a thrown go() must not cancel it. Re-armed only after
    // it fires and the location is still /splash.
    _splashWatch = Timer(const Duration(seconds: 3), _leaveSplashIfNeeded);
    // Defer auth init until after the first frame so the UI appears immediately.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      debugPrint(
        '[OneSource] first frame +${DateTime.now().difference(_started).inMilliseconds}ms',
      );
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
    _splashWatch?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// Last-resort handoff. The splash screen also navigates; this runs even
  /// if that element was unmounted while the location was still /splash.
  void _leaveSplashIfNeeded() {
    if (!mounted) return;
    final router = ref.read(routerProvider);
    final path = router.routeInformationProvider.value.uri.path;
    if (path.isNotEmpty && path != '/splash') {
      debugPrint('[OneSource] splash watchdog idle at $path');
      return;
    }
    debugPrint('[OneSource] splash watchdog → /home (was ${path.isEmpty ? '(empty)' : path})');
    try {
      router.go('/home');
    } catch (e) {
      debugPrint('[OneSource] splash watchdog failed: $e');
    }
    final now = router.routeInformationProvider.value.uri.path;
    if (now.isEmpty || now == '/splash') {
      _splashWatch = Timer(const Duration(milliseconds: 400), _leaveSplashIfNeeded);
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // The first resume happens while the splash is up. Reading the
      // notifications provider here initializes the iOS plugin and can
      // present the permission sheet, which pauses the engine so the
      // splash timer never fires. Wait until the splash deadline has passed.
      unawaited(_refreshNotificationsWhenReady());
    }
  }

  Future<void> _refreshNotificationsWhenReady() async {
    await Future<void>.delayed(const Duration(seconds: 4));
    if (!mounted) return;
    try {
      await ref
          .read(notificationsProvider.notifier)
          .refresh(surfaceBanners: true, quiet: true)
          .timeout(const Duration(seconds: 6));
    } catch (e) {
      debugPrint('[OneSource] notifications refresh skipped: $e');
    }
  }

  Future<void> _initSupabase() async {
    if (isSupabaseReady) return;
    debugPrint('[OneSource] Supabase init starting (background)…');
    try {
      await initializeSupabase().timeout(const Duration(seconds: 6));
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
    final strings = ref.watch(stringsProvider);

    return MaterialApp.router(
      title: 'One Source',
      debugShowCheckedModeBanner: false,
      theme: _theme,
      themeMode: ThemeMode.light,
      locale: Locale(languageCodeLabel(language)),
      routerConfig: router,
      builder: (context, child) => AppStringsScope(
        strings: strings,
        child: child ?? const SizedBox.shrink(),
      ),
    );
  }
}
