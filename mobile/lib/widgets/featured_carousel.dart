import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../models/hero_slide.dart';

/// Tall featured cards carousel (Dribbble-style hero).
class FeaturedCarousel extends StatefulWidget {
  const FeaturedCarousel({super.key, required this.slides});

  final List<HeroSlide> slides;

  @override
  State<FeaturedCarousel> createState() => _FeaturedCarouselState();
}

class _FeaturedCarouselState extends State<FeaturedCarousel> {
  static const _autoplayMs = 5000;

  late final PageController _controller;
  int _active = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _controller = PageController(viewportFraction: 0.82);
    _startAutoplay();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _startAutoplay() {
    _timer?.cancel();
    if (widget.slides.length <= 1) return;
    _timer = Timer.periodic(const Duration(milliseconds: _autoplayMs), (_) {
      if (!mounted) return;
      final next = (_active + 1) % widget.slides.length;
      _controller.animateToPage(
        next,
        duration: const Duration(milliseconds: 450),
        curve: Curves.easeOutCubic,
      );
    });
  }

  void _openSlide(HeroSlide slide) {
    final href = slide.ctaHref;
    if (href.startsWith('/category/')) {
      context.push(href);
    } else if (href == '/categories') {
      context.go('/categories');
    } else {
      context.go('/shop');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.slides.isEmpty) return const SizedBox.shrink();

    return SizedBox(
      height: 220,
      child: PageView.builder(
        controller: _controller,
        itemCount: widget.slides.length,
        onPageChanged: (i) => setState(() => _active = i),
        itemBuilder: (context, index) {
          final slide = widget.slides[index];
          final image = slide.image.isNotEmpty
              ? slide.image
              : HeroSlide.fallbackImages[index % HeroSlide.fallbackImages.length];

          return AnimatedScale(
            scale: index == _active ? 1.0 : 0.96,
            duration: const Duration(milliseconds: 300),
            child: Padding(
              padding: const EdgeInsets.only(right: 10),
              child: GestureDetector(
                onTap: () => _openSlide(slide),
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(22),
                    boxShadow: softCardShadow,
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      CachedNetworkImage(
                        imageUrl: image,
                        fit: BoxFit.cover,
                        placeholder: (_, __) => const ColoredBox(color: AppColors.muted),
                        errorWidget: (_, __, ___) => ColoredBox(
                          color: AppColors.accentLight,
                          child: Center(
                            child: Text(slide.badge, textAlign: TextAlign.center),
                          ),
                        ),
                      ),
                      DecoratedBox(
                        decoration: const BoxDecoration(gradient: AppGradients.heroOverlay),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (slide.badge.isNotEmpty)
                              Text(
                                slide.badge,
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.85),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            const Spacer(),
                            Text(
                              slide.title,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 17,
                                fontWeight: FontWeight.w800,
                                height: 1.15,
                              ),
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    slide.interpolate(slide.subtitle),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: Colors.white.withValues(alpha: 0.9),
                                      fontSize: 11,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                FilledButton(
                                  onPressed: () => _openSlide(slide),
                                  style: FilledButton.styleFrom(
                                    backgroundColor: AppColors.lemonGreen,
                                    foregroundColor: AppColors.text,
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                    minimumSize: Size.zero,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                    textStyle: const TextStyle(
                                      fontWeight: FontWeight.w800,
                                      fontSize: 12,
                                    ),
                                  ),
                                  child: const Text('Shop now'),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
