import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../services/auth_service.dart';
import '../utils/onboarding_prefs.dart';
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
  bool _navigated = false;

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

    unawaited(_warmSupabase());
    _auto = Timer(const Duration(milliseconds: 2200), _continue);
  }

  @override
  void dispose() {
    _auto?.cancel();
    _enter.dispose();
    _breathe.dispose();
    super.dispose();
  }

  Future<void> _warmSupabase() async {
    if (isSupabaseReady) return;
    try {
      await initializeSupabase().timeout(const Duration(seconds: 4));
    } catch (_) {}
    if (mounted) {
      ref.read(supabaseReadyProvider.notifier).state = isSupabaseReady;
    }
  }

  Future<void> _continue() async {
    if (_navigated || !mounted) return;
    _navigated = true;
    _auto?.cancel();
    final done = await isOnboardingDone();
    if (!mounted) return;
    context.go(done ? '/home' : '/onboarding');
  }

  @override
  Widget build(BuildContext context) {
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
                        child: const BrandLogo(height: 44, onDark: true),
                      ),
                      const SizedBox(height: 28),
                      Text(
                        'One Source',
                        style: TextStyle(
                          fontFamily: 'Gabarito',
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 2.4,
                          color: Colors.white.withValues(alpha: 0.55),
                        ),
                      ),
                      const SizedBox(height: 10),
                      const Text(
                        'Shop fresh. Cook well.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontFamily: 'Gabarito',
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.4,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 36),
                      SizedBox(
                        width: 28,
                        height: 28,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.2,
                          color: Colors.white.withValues(alpha: 0.55),
                        ),
                      ),
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
