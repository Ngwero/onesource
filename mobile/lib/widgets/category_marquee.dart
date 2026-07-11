import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../models/product.dart';

class CategoryMarquee extends StatefulWidget {
  const CategoryMarquee({super.key, required this.categories});

  final List<Category> categories;

  @override
  State<CategoryMarquee> createState() => _CategoryMarqueeState();
}

class _CategoryMarqueeState extends State<CategoryMarquee> with SingleTickerProviderStateMixin {
  static const _duration = Duration(seconds: 42);

  late final AnimationController _controller;
  final _loopKey = GlobalKey();
  double _loopWidth = 0;
  bool _started = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: _duration);
    SchedulerBinding.instance.addPostFrameCallback((_) => _measureLoop());
  }

  void _measureLoop() {
    if (!mounted) return;

    final box = _loopKey.currentContext?.findRenderObject() as RenderBox?;
    if (box == null || !box.hasSize || box.size.width <= 0) {
      SchedulerBinding.instance.addPostFrameCallback((_) => _measureLoop());
      return;
    }

    final width = box.size.width;
    if ((width - _loopWidth).abs() > 0.5) {
      setState(() => _loopWidth = width);
    }

    if (!_started && _loopWidth > 0) {
      _started = true;
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Widget _categoryRow() {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _CategoryMarqueeItem(
          label: 'All',
          icon: '🛒',
          animation: _controller,
          phase: 0,
          onTap: () => context.push('/categories'),
        ),
        for (var i = 0; i < widget.categories.length; i++)
          _CategoryMarqueeItem(
            label: widget.categories[i].name,
            icon: widget.categories[i].icon,
            animation: _controller,
            phase: i + 1,
            onTap: () => context.push('/category/${widget.categories[i].id}'),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.categories.isEmpty) return const SizedBox.shrink();

    return Consumer(
      builder: (context, ref, _) {
        final shopByCategory = ref.watch(stringsProvider).shopByCategory;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              shopByCategory,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.text),
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: SizedBox(
                height: 96,
                child: ClipRect(
                  child: Stack(
                    alignment: Alignment.centerLeft,
                    children: [
                      Align(
                        alignment: Alignment.centerLeft,
                        child: UnconstrainedBox(
                          constrainedAxis: Axis.vertical,
                          clipBehavior: Clip.hardEdge,
                          alignment: Alignment.centerLeft,
                          child: AnimatedBuilder(
                            animation: _controller,
                            builder: (context, child) {
                              return Transform.translate(
                                offset: Offset(-_controller.value * _loopWidth, 0),
                                child: child,
                              );
                            },
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                KeyedSubtree(key: _loopKey, child: _categoryRow()),
                                _categoryRow(),
                              ],
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 24,
                        child: IgnorePointer(
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  AppColors.canvas,
                                  AppColors.canvas.withValues(alpha: 0),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: 24,
                        child: IgnorePointer(
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  AppColors.canvas.withValues(alpha: 0),
                                  AppColors.canvas,
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _CategoryMarqueeItem extends StatelessWidget {
  const _CategoryMarqueeItem({
    required this.label,
    required this.icon,
    required this.animation,
    required this.phase,
    required this.onTap,
  });

  final String label;
  final String icon;
  final Animation<double> animation;
  final int phase;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 16),
      child: GestureDetector(
        onTap: onTap,
        child: SizedBox(
          width: 72,
          child: AnimatedBuilder(
            animation: animation,
            builder: (context, child) {
              final bob = math.sin((animation.value * math.pi * 2) + phase * 0.65) * 4;
              final wobble = math.sin((animation.value * math.pi * 2) + phase * 0.4) * 0.04;
              return Transform.translate(
                offset: Offset(0, bob),
                child: Transform.rotate(
                  angle: wobble,
                  child: child,
                ),
              );
            },
            child: Column(
              children: [
                Container(
                  width: 58,
                  height: 58,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.border),
                    boxShadow: softCardShadow,
                  ),
                  alignment: Alignment.center,
                  child: Text(icon, style: const TextStyle(fontSize: 24)),
                ),
                const SizedBox(height: 8),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
