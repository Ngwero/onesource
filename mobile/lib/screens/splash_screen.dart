import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../services/auth_service.dart';
import '../widgets/brand_logo.dart';

/// Branded splash — centered logo with loading indicator (GoRide-style).
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _fadeController;
  late final Animation<double> _fade;

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(vsync: this, duration: const Duration(milliseconds: 700));
    _fade = CurvedAnimation(parent: _fadeController, curve: Curves.easeOut);
    _fadeController.forward();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    await Future.wait([
      Future<void>.delayed(const Duration(milliseconds: 2400)),
      _ensureSupabase(),
    ]);
    if (!mounted) return;
    context.go('/home');
  }

  Future<void> _ensureSupabase() async {
    if (isSupabaseReady) return;
    try {
      await initializeSupabase().timeout(const Duration(seconds: 8));
    } catch (_) {}
    if (mounted) {
      ref.read(supabaseReadyProvider.notifier).state = isSupabaseReady;
    }
  }

  @override
  void dispose() {
    _fadeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: FadeTransition(
        opacity: _fade,
        child: SafeArea(
          child: Column(
            children: [
              const Spacer(flex: 3),
              const BrandLogoMark(size: 88, showWordmark: true),
              const Spacer(flex: 4),
              const _SplashLoader(),
              const SizedBox(height: 48),
            ],
          ),
        ),
      ),
    );
  }
}

class _SplashLoader extends StatelessWidget {
  const _SplashLoader();

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: 36,
          height: 36,
          child: CircularProgressIndicator(
            strokeWidth: 2.5,
            color: AppColors.darkGreen.withValues(alpha: 0.85),
          ),
        ),
        const SizedBox(height: 14),
        Text(
          'Loading',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: AppColors.textMuted.withValues(alpha: 0.9),
            letterSpacing: 0.2,
          ),
        ),
      ],
    );
  }
}
