import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'config/theme.dart';
import 'i18n/app_strings.dart';
import 'i18n/i18n_catalog.dart';
import 'i18n/languages.dart';
import 'providers/delivery_country_provider.dart';
import 'providers/locale_provider.dart';
import 'providers/notifications_provider.dart';
import 'router/app_router.dart';
import 'services/auth_service.dart';
import 'services/system_notifications.dart';

/// Armed in [main] before [runApp]. Splash disposal cannot cancel it, and it
/// still fires when the first frame is late — as long as [main] was not
/// blocked on a platform channel.
class SplashDeadline {
  SplashDeadline._();

  static const limit = Duration(milliseconds: 1500);
  static bool reached = false;
  static VoidCallback? _listener;
  static Timer? _retry;
  static bool _armed = false;

  static void arm() {
    if (_armed) return;
    _armed = true;
    debugPrint('[OneSource] splash deadline armed');
    Timer(limit, _fire);
  }

  static void bind(VoidCallback listener) {
    _listener = listener;
    if (reached) scheduleMicrotask(listener);
  }

  static void unbind(VoidCallback listener) {
    if (identical(_listener, listener)) _listener = null;
  }

  static void _fire() {
    reached = true;
    debugPrint('[OneSource] splash deadline fired');
    final listener = _listener;
    if (listener != null) {
      listener();
      return;
    }
    _retry?.cancel();
    var tries = 0;
    _retry = Timer.periodic(const Duration(milliseconds: 200), (timer) {
      tries += 1;
      final pending = _listener;
      if (pending != null) {
        timer.cancel();
        pending();
      } else if (tries >= 25) {
        timer.cancel();
        debugPrint('[OneSource] splash deadline: app not mounted');
      }
    });
  }
}

bool _isSplashPath(String path) =>
    path.isEmpty || path == '/splash' || path == '/splash/';

class OneSourceApp extends ConsumerStatefulWidget {
  const OneSourceApp({super.key});

  @override
  ConsumerState<OneSourceApp> createState() => _OneSourceAppState();
}

class _OneSourceAppState extends ConsumerState<OneSourceApp>
    with WidgetsBindingObserver {
  late final ThemeData _theme = buildAppTheme();
  late final VoidCallback _deadlineListener = _leaveSplashIfNeeded;
  Timer? _splashWatch;
  final DateTime _started = DateTime.now();

  @override
  void initState() {
    super.initState();
    // Before any plugin or network work. The timer itself was armed in main().
    SplashDeadline.bind(_deadlineListener);
    WidgetsBinding.instance.addObserver(this);
    onSupabaseInitialized = () {
      if (mounted) {
        ref.read(supabaseReadyProvider.notifier).state = isSupabaseReady;
      }
    };
    WidgetsBinding.instance.addPostFrameCallback((_) {
      debugPrint(
        '[OneSource] first frame +${DateTime.now().difference(_started).inMilliseconds}ms',
      );
      if (!mounted) return;
      if (SplashDeadline.reached) _leaveSplashIfNeeded();
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
      // Next turn, after this frame callback returns, so a plugin channel
      // cannot freeze the splash that just painted.
      unawaited(Future<void>.delayed(Duration.zero, _startAfterFirstFrame));
    });
  }

  @override
  void dispose() {
    SplashDeadline.unbind(_deadlineListener);
    _splashWatch?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  void _startAfterFirstFrame() {
    if (!mounted) return;
    // Restore the signed-in session before starting lower-priority locale and
    // geo work, so account-aware UI settles as early as possible.
    unawaited(_initSupabase());
    unawaited(_loadI18n());
    ref.read(deliveryCountryProvider);
  }

  Future<void> _loadI18n() async {
    try {
      await I18nCatalog.load().timeout(const Duration(seconds: 3));
      debugPrint('[OneSource] i18n ready');
    } catch (e) {
      debugPrint('[OneSource] i18n not ready: $e');
    }
  }

  /// Last-resort handoff. Runs from the timer armed in main(), so a disposed
  /// splash element cannot cancel it. Always lands on /home.
  void _leaveSplashIfNeeded() {
    if (!mounted) return;
    var left = false;
    try {
      final router = ref.read(routerProvider);
      final path = router.routeInformationProvider.value.uri.path;
      if (!_isSplashPath(path)) {
        debugPrint('[OneSource] splash watchdog idle at $path');
        return;
      }
      debugPrint(
          '[OneSource] splash watchdog → /home (was ${path.isEmpty ? '(empty)' : path})');
      router.go('/home');
      final now = router.routeInformationProvider.value.uri.path;
      left = !_isSplashPath(now);
      debugPrint('[OneSource] splash watchdog now $now');
    } catch (e, stack) {
      debugPrint('[OneSource] splash watchdog failed: $e\n$stack');
    }
    if (!mounted || left) return;
    _splashWatch?.cancel();
    _splashWatch =
        Timer(const Duration(milliseconds: 300), _leaveSplashIfNeeded);
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

  Future<void> _refreshNotificationsWhenReady({int attempt = 0}) async {
    await Future<void>.delayed(const Duration(seconds: 4));
    if (!mounted) return;
    try {
      final path =
          ref.read(routerProvider).routeInformationProvider.value.uri.path;
      // The permission sheet pauses the engine. Never raise it over the splash.
      if (_isSplashPath(path) && attempt < 4) {
        unawaited(_refreshNotificationsWhenReady(attempt: attempt + 1));
        return;
      }
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
