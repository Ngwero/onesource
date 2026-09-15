import 'dart:async';
import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../models/hero_slide.dart';
import '../providers/hero_provider.dart';
import '../utils/onboarding_prefs.dart';
import '../widgets/brand_logo.dart';

const _accentCycle = <Color>[
  Color(0xFFB4CF5A),
  Color(0xFFF0C947),
  Color(0xFF2E5E4A),
];

/// Apple / PayPal–inspired onboarding. Slides come from admin (hero placement
/// `onboarding`); images/copy editable in Hero carousel → App onboarding.
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen>
    with TickerProviderStateMixin {
  late final PageController _page;
  late final AnimationController _float;
  late final AnimationController _ctaPulse;

  double _pageValue = 0;
  int _index = 0;
  Timer? _autoplay;
  bool _userPaused = false;

  static const _autoplaySeconds = 4;

  @override
  void initState() {
    super.initState();
    _page = PageController(viewportFraction: 1);
    _page.addListener(() {
      final v = _page.page ?? _index.toDouble();
      if ((v - _pageValue).abs() > 0.001) {
        setState(() => _pageValue = v);
      }
    });

    _float = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 4200),
    )..repeat(reverse: true);

    _ctaPulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    )..repeat(reverse: true);

    _restartAutoplay();
  }

  @override
  void dispose() {
    _autoplay?.cancel();
    _page.dispose();
    _float.dispose();
    _ctaPulse.dispose();
    super.dispose();
  }

  void _restartAutoplay() {
    _autoplay?.cancel();
    if (_userPaused) return;
    _autoplay = Timer.periodic(
      const Duration(seconds: _autoplaySeconds),
      (_) => _autoAdvance(),
    );
  }

  void _pauseAutoplayTemporarily() {
    _userPaused = true;
    _autoplay?.cancel();
    Future<void>.delayed(const Duration(seconds: 8), () {
      if (!mounted) return;
      _userPaused = false;
      _restartAutoplay();
    });
  }

  void _autoAdvance() {
    if (!mounted || _userPaused || !_page.hasClients) return;
    final count = _slideCount;
    if (count <= 1) return;
    if (_index >= count - 1) {
      _page.animateToPage(
        0,
        duration: const Duration(milliseconds: 560),
        curve: Curves.easeOutCubic,
      );
    } else {
      _page.nextPage(
        duration: const Duration(milliseconds: 560),
        curve: Curves.easeOutCubic,
      );
    }
  }

  int get _slideCount {
    final async = ref.read(heroSlidesProvider('onboarding'));
    return async.maybeWhen(
      data: (s) => s.isEmpty ? HeroSlide.onboardingDefaults.length : s.length,
      orElse: () => HeroSlide.onboardingDefaults.length,
    );
  }

  List<HeroSlide> _slidesOf(AsyncValue<List<HeroSlide>> async) {
    return async.maybeWhen(
      data: (s) => s.isEmpty ? HeroSlide.onboardingDefaults : s,
      orElse: () => HeroSlide.onboardingDefaults,
    );
  }

  Future<void> _finish() async {
    _autoplay?.cancel();
    HapticFeedback.mediumImpact();
    await setOnboardingDone();
    if (!mounted) return;
    context.go('/home');
  }

  void _next(int count) {
    if (_index >= count - 1) {
      _finish();
      return;
    }
    HapticFeedback.selectionClick();
    _pauseAutoplayTemporarily();
    _page.nextPage(
      duration: const Duration(milliseconds: 520),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(heroSlidesProvider('onboarding'));
    final slides = _slidesOf(async);
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    final safeIndex = _index.clamp(0, slides.length - 1);
    final page = slides[safeIndex];
    final accent = _accentCycle[safeIndex % _accentCycle.length];

    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: Stack(
        fit: StackFit.expand,
        children: [
          Positioned(
            top: -120,
            right: -80,
            child: _GlowOrb(size: 280, color: accent.withValues(alpha: 0.22)),
          ),
          Positioned(
            bottom: 80,
            left: -100,
            child: _GlowOrb(
              size: 260,
              color: AppColors.darkGreen.withValues(alpha: 0.12),
            ),
          ),
          SafeArea(
            bottom: false,
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(22, 10, 10, 0),
                  child: Row(
                    children: [
                      const BrandLogo(height: 26),
                      const Spacer(),
                      TextButton(
                        onPressed: _finish,
                        style: TextButton.styleFrom(
                          foregroundColor: AppColors.textMuted,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 10,
                          ),
                        ),
                        child: const Text(
                          'Skip',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 15,
                            letterSpacing: -0.2,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: NotificationListener<ScrollNotification>(
                    onNotification: (n) {
                      if (n is ScrollStartNotification &&
                          n.dragDetails != null) {
                        _pauseAutoplayTemporarily();
                      }
                      return false;
                    },
                    child: PageView.builder(
                      controller: _page,
                      physics: const BouncingScrollPhysics(
                        parent: AlwaysScrollableScrollPhysics(),
                      ),
                      itemCount: slides.length,
                      onPageChanged: (i) {
                        HapticFeedback.selectionClick();
                        setState(() => _index = i);
                        if (!_userPaused) _restartAutoplay();
                      },
                      itemBuilder: (context, i) {
                        final delta = (_pageValue - i).abs().clamp(0.0, 1.0);
                        return _ParallaxPage(
                          slide: slides[i],
                          accent: _accentCycle[i % _accentCycle.length],
                          delta: delta,
                          float: _float,
                        );
                      },
                    ),
                  ),
                ),
                Padding(
                  padding: EdgeInsets.fromLTRB(28, 4, 28, 18 + bottomInset),
                  child: Column(
                    children: [
                      _PageIndicator(
                        count: slides.length,
                        value: _pageValue,
                        activeColor: AppColors.darkGreen,
                      ),
                      const SizedBox(height: 22),
                      AnimatedBuilder(
                        animation: _ctaPulse,
                        builder: (context, child) {
                          final lift = 1 + (_ctaPulse.value * 0.012);
                          return Transform.scale(scale: lift, child: child);
                        },
                        child: SizedBox(
                          width: double.infinity,
                          height: 56,
                          child: FilledButton(
                            onPressed: () => _next(slides.length),
                            style: FilledButton.styleFrom(
                              backgroundColor: AppColors.darkGreen,
                              foregroundColor: Colors.white,
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(28),
                              ),
                            ),
                            child: AnimatedSwitcher(
                              duration: const Duration(milliseconds: 280),
                              switchInCurve: Curves.easeOutCubic,
                              switchOutCurve: Curves.easeInCubic,
                              transitionBuilder: (child, anim) {
                                return FadeTransition(
                                  opacity: anim,
                                  child: SlideTransition(
                                    position: Tween<Offset>(
                                      begin: const Offset(0, 0.25),
                                      end: Offset.zero,
                                    ).animate(anim),
                                    child: child,
                                  ),
                                );
                              },
                              child: Text(
                                page.cta,
                                key: ValueKey('${page.cta}_$safeIndex'),
                                style: const TextStyle(
                                  fontFamily: 'Gabarito',
                                  fontWeight: FontWeight.w700,
                                  fontSize: 17,
                                  letterSpacing: -0.3,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ParallaxPage extends StatelessWidget {
  const _ParallaxPage({
    required this.slide,
    required this.accent,
    required this.delta,
    required this.float,
  });

  final HeroSlide slide;
  final Color accent;
  final double delta;
  final Animation<double> float;

  @override
  Widget build(BuildContext context) {
    final opacity = (1 - delta * 0.85).clamp(0.15, 1.0);
    final scale = 1 - (delta * 0.08);
    final textShift = delta * 28;
    final imageShift = delta * 40;

    return Opacity(
      opacity: opacity,
      child: Transform.scale(
        scale: scale,
        alignment: Alignment.center,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(28, 12, 28, 8),
          child: Column(
            children: [
              Expanded(
                flex: 11,
                child: AnimatedBuilder(
                  animation: float,
                  builder: (context, child) {
                    final bob = math.sin(float.value * math.pi) * 8;
                    return Transform.translate(
                      offset: Offset(0, bob - imageShift * 0.35),
                      child: child,
                    );
                  },
                  child: Transform.translate(
                    offset: Offset(imageShift * 0.2, 0),
                    child: _HeroVisual(
                      imageUrl: slide.image,
                      accent: accent,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 28),
              Transform.translate(
                offset: Offset(0, textShift),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: accent.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        slide.badge.toUpperCase(),
                        style: TextStyle(
                          fontFamily: 'Gabarito',
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.2,
                          color: accent == AppColors.darkGreen
                              ? AppColors.darkGreen
                              : AppColors.leafDark,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      slide.title,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontFamily: 'Gabarito',
                        fontSize: 36,
                        fontWeight: FontWeight.w800,
                        height: 1.08,
                        letterSpacing: -1.1,
                        color: AppColors.text,
                      ),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      slide.subtitle,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontFamily: 'Gabarito',
                        fontSize: 16,
                        height: 1.45,
                        fontWeight: FontWeight.w500,
                        letterSpacing: -0.2,
                        color: AppColors.textMuted.withValues(alpha: 0.95),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }
}

class _HeroVisual extends StatelessWidget {
  const _HeroVisual({required this.imageUrl, required this.accent});

  final String imageUrl;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: AspectRatio(
        aspectRatio: 1,
        child: Stack(
          alignment: Alignment.center,
          children: [
            Container(
              width: double.infinity,
              height: double.infinity,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    accent.withValues(alpha: 0.35),
                    accent.withValues(alpha: 0.08),
                    Colors.transparent,
                  ],
                  stops: const [0.0, 0.55, 1.0],
                ),
              ),
            ),
            FractionallySizedBox(
              widthFactor: 0.88,
              heightFactor: 0.88,
              child: Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: accent.withValues(alpha: 0.28),
                      blurRadius: 40,
                      offset: const Offset(0, 18),
                    ),
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.08),
                      blurRadius: 24,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: ClipOval(
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Image.network(
                        imageUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => ColoredBox(
                          color: AppColors.leafPale,
                          child: Icon(
                            Icons.eco_rounded,
                            size: 72,
                            color: accent,
                          ),
                        ),
                      ),
                      DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.white.withValues(alpha: 0.18),
                              Colors.transparent,
                              Colors.black.withValues(alpha: 0.12),
                            ],
                            stops: const [0.0, 0.35, 1.0],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            Positioned(
              right: 18,
              bottom: 28,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.72),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.9),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.bolt_rounded, size: 16, color: accent),
                        const SizedBox(width: 4),
                        const Text(
                          'Fast',
                          style: TextStyle(
                            fontFamily: 'Gabarito',
                            fontWeight: FontWeight.w800,
                            fontSize: 13,
                            color: AppColors.text,
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
      ),
    );
  }
}

class _PageIndicator extends StatelessWidget {
  const _PageIndicator({
    required this.count,
    required this.value,
    required this.activeColor,
  });

  final int count;
  final double value;
  final Color activeColor;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        for (var i = 0; i < count; i++)
          AnimatedContainer(
            duration: const Duration(milliseconds: 280),
            curve: Curves.easeOutCubic,
            margin: const EdgeInsets.symmetric(horizontal: 4),
            width: (1 - (value - i).abs().clamp(0.0, 1.0)) * 16 + 8,
            height: 8,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(999),
              color: Color.lerp(
                activeColor.withValues(alpha: 0.2),
                activeColor,
                (1 - (value - i).abs()).clamp(0.0, 1.0),
              ),
            ),
          ),
      ],
    );
  }
}

class _GlowOrb extends StatelessWidget {
  const _GlowOrb({required this.size, required this.color});

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
          gradient: RadialGradient(
            colors: [color, color.withValues(alpha: 0)],
          ),
        ),
      ),
    );
  }
}
