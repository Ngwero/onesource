import 'package:flutter/material.dart';

/// Slide + fade entrance for list/grid items as they scroll into view.
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

class _ScrollSlideInState extends State<ScrollSlideIn> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<Offset> _slide;
  late final Animation<double> _fade;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: widget.duration);
    final begin = widget.axis == Axis.vertical
        ? Offset(0, widget.index.isEven ? 0.14 : 0.1)
        : Offset(widget.index.isEven ? -0.08 : 0.08, 0.08);
    final curve = CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic);
    _slide = Tween<Offset>(begin: begin, end: Offset.zero).animate(curve);
    _fade = Tween<double>(begin: 0, end: 1).animate(curve);

    final delay = Duration(
      milliseconds: (widget.index % widget.maxStaggerItems) * widget.staggerMs,
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
