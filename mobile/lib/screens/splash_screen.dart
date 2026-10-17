import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../utils/onboarding_prefs.dart';
import '../widgets/brand_loader.dart';
import '../widgets/brand_logo.dart';

/// Soft Apple-style brand splash — logo spring, then route to onboarding/home.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with TickerProviderStateMixin {
  late final AnimationController _enter;
  late final AnimationController _breathe;
  late final Animation<double> _logoScale;
  late final Animation<double> _fade;
  late final Animation<Offset> _slide;

  Timer? _auto;
  Timer? _fallback;
  bool _left = false;
  GoRouter? _router;

  @override
  void initState() {
    super.initState();
    _enter = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _breathe = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2800),
    )..repeat(reverse: true);

    _logoScale = Tween<double>(begin: 0.82, end: 1).animate(
      CurvedAnimation(parent: _enter, curve: Curves.easeOutBack),
    );
    _fade = CurvedAnimation(
      parent: _enter,
      curve: const Interval(0.15, 1, curve: Curves.easeOut),
    );
    _slide = Tween<Offset>(
      begin: const Offset(0, 0.04),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _enter,
        curve: const Interval(0.1, 1, curve: Curves.easeOutCubic),
      ),
    );
    _enter.forward();

    // Capture the router on the first frame. Later ticks navigate through this
    // instance, so a disposed splash element can still leave /splash.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _router = GoRouter.of(context);
    });

    // Preferred handoff (onboarding or home). The unconditional exit is
    // SplashDeadline, armed in main() before runApp — this element must not
    // be the only clock, and it must not start plugins before the first frame.
    _auto = Timer(const Duration(milliseconds: 650), () {
      unawaited(_leave());
    });
    _fallback = Timer(const Duration(milliseconds: 1500), () {
      unawaited(_leave(forceHome: true, fromHard: true));
    });
  }

  @override
  void dispose() {
    _auto?.cancel();
    // Keep the hard deadline alive across dispose. Cold Xcode launches can
    // unmount this element while the route is still /splash; the captured
    // router is what finishes the handoff.
    if (_left) _fallback?.cancel();
    _enter.dispose();
    _breathe.dispose();
    super.dispose();
  }

  GoRouter? get _nav {
    final captured = _router;
    if (captured != null) return captured;
    if (!mounted) return null;
    final fromContext = GoRouter.maybeOf(context);
    if (fromContext != null) _router = fromContext;
    return fromContext;
  }

  bool _stillOnSplash(GoRouter router) {
    final path = router.routeInformationProvider.value.uri.path;
    return path.isEmpty || path == '/splash';
  }

  Future<void> _leave({bool forceHome = false, bool fromHard = false}) async {
    final router = _nav;
    if (_left) return;
    if (router == null) {
      // The 1.5s attempt must not touch the hard deadline. On a physical
      // device the first frame can land after 1.5s; cancelling here is what
      // left the splash with no timer.
      if (fromHard) _rearmHard();
      return;
    }
    if (!_stillOnSplash(router)) {
      _markLeft();
      return;
    }

    var home = forceHome;
    if (!home) {
      try {
        home =
            await isOnboardingDone().timeout(const Duration(milliseconds: 500));
      } catch (e) {
        debugPrint('[OneSource] onboarding prefs failed: $e');
        home = true;
      }
    }
    final latest = _nav;
    if (_left) return;
    if (latest == null) {
      if (fromHard) _rearmHard();
      return;
    }
    if (!_stillOnSplash(latest)) {
      _markLeft();
      return;
    }
    if (forceHome) home = true;

    final target = home ? '/home' : '/onboarding';
    debugPrint('[OneSource] splash → $target');
    if (_go(latest, target)) return;
    if (target != '/home' && _go(latest, '/home')) return;
    if (fromHard) _rearmHard();
  }

  void _markLeft() {
    _left = true;
    _auto?.cancel();
    _fallback?.cancel();
  }

  bool _go(GoRouter router, String target) {
    try {
      router.go(target);
      final path = router.routeInformationProvider.value.uri.path;
      debugPrint('[OneSource] splash location $path');
      if (path.isEmpty || path == '/splash') return false;
      _markLeft();
      return true;
    } catch (e) {
      debugPrint('[OneSource] splash navigate failed: $e');
      return false;
    }
  }

  /// Only after the hard timer has fired. Does not cancel a pending deadline
  /// and does not give up while the route is still /splash.
  void _rearmHard() {
    if (_left) return;
    _fallback = Timer(const Duration(milliseconds: 400), () {
      unawaited(_leave(forceHome: true, fromHard: true));
    });
  }

  @override
  Widget build(BuildContext context) {
    _router ??= GoRouter.of(context);
    return Scaffold(
      backgroundColor: AppColors.darkGreen,
      body: Stack(
        fit: StackFit.expand,
        children: [
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFF244A3B),
                  AppColors.darkGreen,
                  Color(0xFF1C3D30),
                ],
              ),
            ),
          ),
          AnimatedBuilder(
            animation: _breathe,
            builder: (context, _) {
              final t = _breathe.value;
              return Stack(
                children: [
                  Positioned(
                    top: -80 + t * 20,
                    right: -60,
                    child: _SoftBlob(
                      size: 220,
                      color: AppColors.lemonGreen.withValues(alpha: 0.14),
                    ),
                  ),
                  Positioned(
                    bottom: -40 - t * 16,
                    left: -70,
                    child: _SoftBlob(
                      size: 240,
                      color: Colors.white.withValues(alpha: 0.06),
                    ),
                  ),
                ],
              );
            },
          ),
          SafeArea(
            child: FadeTransition(
              opacity: _fade,
              child: SlideTransition(
                position: _slide,
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      ScaleTransition(
                        scale: _logoScale,
                        child: const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 28),
                          child: BrandLogo(
                            height: 56,
                            onDark: true,
                            alignment: Alignment.center,
                          ),
                        ),
                      ),
                      const SizedBox(height: 28),
                      const BrandLoader(
                          size: 44, onDark: true, excludeSemantics: true),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SoftBlob extends StatelessWidget {
  const _SoftBlob({required this.size, required this.color});

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: color,
          boxShadow: [
            BoxShadow(
              color: color,
              blurRadius: size * 0.45,
              spreadRadius: size * 0.08,
            ),
          ],
        ),
      ),
    );
  }
}
