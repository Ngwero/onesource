import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../models/hero_slide.dart';

class HeroSlider extends StatefulWidget {
  const HeroSlider({super.key, required this.slides});

  final List<HeroSlide> slides;

  @override
  State<HeroSlider> createState() => _HeroSliderState();
}

class _HeroSliderState extends State<HeroSlider> {
  static const _autoplayMs = 6000;

  late final PageController _pageController;
  int _active = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _startAutoplay();
  }

  @override
  void didUpdateWidget(covariant HeroSlider oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.slides.length != widget.slides.length) {
      _active = 0;
      _startAutoplay();
    }
  }

  void _startAutoplay() {
    _timer?.cancel();
    if (widget.slides.length <= 1) return;
    _timer = Timer.periodic(const Duration(milliseconds: _autoplayMs), (_) => _next());
  }

  void _goTo(int index) {
    final count = widget.slides.length;
    if (count == 0) return;
    final next = ((index % count) + count) % count;
    setState(() => _active = next);
    _pageController.animateToPage(
      next,
      duration: const Duration(milliseconds: 500),
      curve: Curves.easeInOut,
    );
  }

  void _next() => _goTo(_active + 1);
  void _prev() => _goTo(_active - 1);

  @override
  void dispose() {
    _timer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  void _navigate(String href) {
    if (href.startsWith('/category/')) {
      context.push(href);
    } else if (href.startsWith('/shop')) {
      context.go('/shop');
    } else if (href == '/categories') {
      context.go('/categories');
    } else {
      context.go(href);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.slides.isEmpty) return const SizedBox.shrink();

    return AspectRatio(
      aspectRatio: 4 / 3,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Stack(
          fit: StackFit.expand,
          children: [
            PageView.builder(
              controller: _pageController,
              itemCount: widget.slides.length,
              onPageChanged: (i) => setState(() => _active = i),
              itemBuilder: (context, index) => _SlideView(
                slide: widget.slides[index],
                onNavigate: _navigate,
              ),
            ),
            if (widget.slides.length > 1) ...[
              Positioned(
                left: 8,
                top: 0,
                bottom: 0,
                child: Center(
                  child: _NavButton(icon: Icons.chevron_left, onTap: _prev),
                ),
              ),
              Positioned(
                right: 8,
                top: 0,
                bottom: 0,
                child: Center(
                  child: _NavButton(icon: Icons.chevron_right, onTap: _next),
                ),
              ),
              Positioned(
                left: 0,
                right: 0,
                bottom: 12,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(widget.slides.length, (i) {
                    final selected = i == _active;
                    return GestureDetector(
                      onTap: () => _goTo(i),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        margin: const EdgeInsets.symmetric(horizontal: 3),
                        width: selected ? 24 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: selected ? Colors.white : Colors.white54,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    );
                  }),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SlideView extends StatelessWidget {
  const _SlideView({required this.slide, required this.onNavigate});

  final HeroSlide slide;
  final void Function(String href) onNavigate;

  @override
  Widget build(BuildContext context) {
    final image = slide.image.isNotEmpty
        ? slide.image
        : HeroSlide.fallbackImages[0];

    return Stack(
      fit: StackFit.expand,
      children: [
        CachedNetworkImage(
          imageUrl: image,
          fit: BoxFit.cover,
          placeholder: (_, __) => const ColoredBox(color: AppColors.muted),
          errorWidget: (_, __, ___) => const ColoredBox(
            color: AppColors.accentLight,
            child: Icon(Icons.image_outlined, size: 48),
          ),
        ),
        DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              colors: [
                Colors.black.withValues(alpha: 0.85),
                Colors.black.withValues(alpha: 0.45),
                Colors.transparent,
              ],
              stops: const [0.0, 0.55, 1.0],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (slide.badge.isNotEmpty)
                Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.white24),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(color: AppColors.lemon, shape: BoxShape.circle),
                      ),
                      const SizedBox(width: 8),
                      Flexible(
                        child: Text(
                          slide.badge,
                          style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),
              Text(
                slide.title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  height: 1.2,
                ),
              ),
              if (slide.subtitle.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  slide.interpolate(slide.subtitle),
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 13, height: 1.4),
                ),
              ],
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  FilledButton(
                    onPressed: () => onNavigate(slide.ctaHref),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.accent,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    ),
                    child: Text(slide.cta),
                  ),
                  if (slide.cta2 != null && slide.cta2Href != null)
                    OutlinedButton(
                      onPressed: () => onNavigate(slide.cta2Href!),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Colors.white38),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                      child: Text(slide.cta2!),
                    ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _NavButton extends StatelessWidget {
  const _NavButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white24,
      shape: const CircleBorder(),
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: SizedBox(
          width: 36,
          height: 36,
          child: Icon(icon, color: Colors.white, size: 22),
        ),
      ),
    );
  }
}
