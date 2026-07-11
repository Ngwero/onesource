import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../services/auth_service.dart';

/// Onboarding-style splash with floating animated hero.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  final _pageController = PageController();
  int _page = 0;
  Timer? _autoSlideTimer;
  static const _autoSlideInterval = Duration(seconds: 3);

  static const _pages = [
    _OnboardPage(
      emojis: ['🥦', '🐟', '🥑', '🍅', '🥬'],
      title: 'Affordable fresh produce\nfor everyone',
      body: 'Quality groceries made for every household, every single day across Uganda.',
    ),
    _OnboardPage(
      emojis: ['🛒', '📦', '🚚', '✨'],
      title: 'Shop smarter,\ndelivered faster',
      body: 'Browse categories, add to cart, and get fresh produce brought to your door.',
    ),
    _OnboardPage(
      emojis: ['📍', '📱', '✅', '🛵'],
      title: 'Track every\norder live',
      body: 'Follow your delivery from checkout to your doorstep with real-time updates.',
    ),
    _OnboardPage(
      emojis: ['🌿', '💚', '🏠', '🎉'],
      title: 'Your local shop,\nalways open',
      body: 'Sign in to save details, reorder favourites, and checkout in seconds.',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _scheduleAutoSlide();
    _warmSupabase();
  }

  @override
  void dispose() {
    _autoSlideTimer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  void _scheduleAutoSlide() {
    _autoSlideTimer?.cancel();
    _autoSlideTimer = Timer(_autoSlideInterval, () {
      if (!mounted) return;
      _advanceSlide();
    });
  }

  void _finish() {
    _autoSlideTimer?.cancel();
    context.go('/home');
  }

  void _advanceSlide() {
    if (_page >= _pages.length - 1) {
      _finish();
      return;
    }
    _pageController.nextPage(
      duration: const Duration(milliseconds: 420),
      curve: Curves.easeOutCubic,
    );
  }

  void _next() => _advanceSlide();

  Future<void> _warmSupabase() async {
    if (isSupabaseReady) return;
    try {
      await initializeSupabase().timeout(const Duration(seconds: 12));
    } catch (_) {}
    if (mounted) {
      ref.read(supabaseReadyProvider.notifier).state = isSupabaseReady;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFFE8F4EC), Color(0xFFF4FAF6), Colors.white],
            stops: [0.0, 0.45, 1.0],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 12, 0),
                child: Row(
                  children: [
                    const _CircleLogoIcon(size: 48),
                    const Spacer(),
                    TextButton(
                      onPressed: _finish,
                      child: const Text(
                        'Skip',
                        style: TextStyle(
                          fontFamily: 'Gabarito',
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                          color: AppColors.amber,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: PageView.builder(
                  controller: _pageController,
                  itemCount: _pages.length,
                  onPageChanged: (i) {
                    setState(() => _page = i);
                    _scheduleAutoSlide();
                  },
                  itemBuilder: (context, index) => _OnboardSlide(
                    key: ValueKey(index),
                    page: _pages[index],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 28),
                child: Row(
                  children: [
                    _PageDots(count: _pages.length, index: _page),
                    const Spacer(),
                    FilledButton(
                      onPressed: _next,
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.amber,
                        foregroundColor: AppColors.text,
                        minimumSize: const Size(120, 48),
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: Text(
                        _page == _pages.length - 1 ? 'Get started' : 'Next',
                        style: const TextStyle(
                          fontFamily: 'Gabarito',
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OnboardPage {
  const _OnboardPage({required this.emojis, required this.title, required this.body});

  final List<String> emojis;
  final String title;
  final String body;
}

class _OnboardSlide extends StatefulWidget {
  const _OnboardSlide({super.key, required this.page});

  final _OnboardPage page;

  @override
  State<_OnboardSlide> createState() => _OnboardSlideState();
}

class _OnboardSlideState extends State<_OnboardSlide> with TickerProviderStateMixin {
  late final AnimationController _floatController;
  late final AnimationController _enterController;
  late final Animation<double> _fade;
  late final Animation<Offset> _slideUp;

  @override
  void initState() {
    super.initState();
    _floatController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3200),
    )..repeat();

    _enterController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 650),
    );
    _fade = CurvedAnimation(parent: _enterController, curve: Curves.easeOut);
    _slideUp = Tween<Offset>(begin: const Offset(0, 0.08), end: Offset.zero).animate(
      CurvedAnimation(parent: _enterController, curve: Curves.easeOutCubic),
    );
    _enterController.forward();
  }

  @override
  void dispose() {
    _floatController.dispose();
    _enterController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 28),
      child: Column(
        children: [
          const Spacer(flex: 2),
          _AnimatedHero(
            controller: _floatController,
            emojis: widget.page.emojis,
          ),
          const Spacer(flex: 2),
          FadeTransition(
            opacity: _fade,
            child: SlideTransition(
              position: _slideUp,
              child: Column(
                children: [
                  Text(
                    widget.page.title,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontFamily: 'Gabarito',
                      fontSize: 28,
                      height: 1.15,
                      fontWeight: FontWeight.w800,
                      color: AppColors.darkGreen,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    widget.page.body,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontFamily: 'Gabarito',
                      fontSize: 15,
                      height: 1.45,
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const Spacer(flex: 3),
        ],
      ),
    );
  }
}

class _AnimatedHero extends StatelessWidget {
  const _AnimatedHero({required this.controller, required this.emojis});

  final AnimationController controller;
  final List<String> emojis;

  static const _baseOffsets = [
    Offset(-92, -76),
    Offset(94, -82),
    Offset(-106, 32),
    Offset(100, 38),
    Offset(0, -112),
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 280,
      width: double.infinity,
      child: AnimatedBuilder(
        animation: controller,
        builder: (context, _) {
          final t = controller.value * 2 * math.pi;

          return Stack(
            alignment: Alignment.center,
            children: [
              ...List.generate(emojis.length.clamp(0, _baseOffsets.length), (i) {
                final base = _baseOffsets[i];
                final phase = i * 1.2;
                final bobY = math.sin(t + phase) * 10;
                final driftX = math.cos(t * 0.7 + phase) * 6;
                final spin = math.sin(t * 0.5 + phase) * 0.12;

                return Transform.translate(
                  offset: Offset(base.dx + driftX, base.dy + bobY),
                  child: Transform.rotate(
                    angle: spin,
                    child: Text(emojis[i], style: const TextStyle(fontSize: 32)),
                  ),
                );
              }),
              Transform.scale(
                scale: 1.0 + math.sin(t) * 0.04,
                child: Transform.translate(
                  offset: Offset(0, math.sin(t * 1.3) * 5),
                  child: const _CircleLogoIcon(size: 148),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// Official One Source logo clipped to a true circle (not a square tile).
class _CircleLogoIcon extends StatelessWidget {
  const _CircleLogoIcon({required this.size});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: AppColors.darkGreen.withValues(alpha: 0.14),
            blurRadius: size * 0.18,
            offset: Offset(0, size * 0.06),
          ),
        ],
      ),
      child: ClipOval(
        child: ColoredBox(
          color: Colors.white,
          child: Padding(
            padding: EdgeInsets.all(size * 0.14),
            child: Image.asset(
              'assets/brand/logo-primary.png',
              fit: BoxFit.contain,
              filterQuality: FilterQuality.high,
              errorBuilder: (_, __, ___) => Icon(
                Icons.eco_rounded,
                size: size * 0.4,
                color: AppColors.darkGreen,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _PageDots extends StatelessWidget {
  const _PageDots({required this.count, required this.index});

  final int count;
  final int index;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: List.generate(count, (i) {
        final active = i == index;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 280),
          curve: Curves.easeOutCubic,
          margin: const EdgeInsets.only(right: 6),
          width: active ? 28 : 8,
          height: 8,
          decoration: BoxDecoration(
            color: active ? AppColors.amber : AppColors.border,
            borderRadius: BorderRadius.circular(999),
          ),
        );
      }),
    );
  }
}
