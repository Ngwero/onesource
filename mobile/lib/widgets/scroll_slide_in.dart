import 'package:flutter/material.dart';

import '../utils/device_perf.dart';
export '../utils/device_perf.dart' show reduceMotionForDevice;

/// Slide + fade entrance for list/grid items.
/// Android gets a lighter, shorter version (still slick, not GPU-heavy).
class ScrollSlideIn extends StatefulWidget {
  const ScrollSlideIn({
    super.key,
    required this.child,
    this.index = 0,
    this.axis = Axis.vertical,
    this.duration = const Duration(milliseconds: 480),
    this.staggerMs = 42,
    this.maxStaggerItems = 6,
  });

  final Widget child;
  final int index;
  final Axis axis;
  final Duration duration;
  final int staggerMs;
  final int maxStaggerItems;

  @override
  State<ScrollSlideIn> createState() => _ScrollSlideInState();
}

class _ScrollSlideInState extends State<ScrollSlideIn>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<Offset> _slide;
  late final Animation<double> _fade;

  @override
  void initState() {
    super.initState();
    final light = reduceMotionForDevice;
    final duration = light
        ? const Duration(milliseconds: 260)
        : widget.duration;
    _controller = AnimationController(vsync: this, duration: duration);

    final dy = light ? 0.06 : (widget.index.isEven ? 0.14 : 0.1);
    final dx = light ? 0.04 : 0.08;
    final begin = widget.axis == Axis.vertical
        ? Offset(0, dy)
        : Offset(widget.index.isEven ? -dx : dx, light ? 0.04 : 0.08);
    final curve =
        CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic);
    _slide = Tween<Offset>(begin: begin, end: Offset.zero).animate(curve);
    _fade = Tween<double>(begin: light ? 0.35 : 0, end: 1).animate(curve);

    final staggerCap = light ? 4 : widget.maxStaggerItems;
    final staggerStep = light ? 28 : widget.staggerMs;
    final delay = Duration(
      milliseconds: (widget.index % staggerCap) * staggerStep,
    );
    Future<void>.delayed(delay, () {
      if (mounted) _controller.forward();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fade,
      child: SlideTransition(
        position: _slide,
        child: widget.child,
      ),
    );
  }
}
