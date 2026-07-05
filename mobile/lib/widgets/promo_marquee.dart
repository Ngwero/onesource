import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

import '../config/theme.dart';

class PromoMarquee extends StatefulWidget {
  const PromoMarquee({super.key});

  static const phrases = [
    'Farm-fresh produce delivered across Uganda',
    'Same-day delivery in Greater Kampala',
    'Organic & seasonal picks in stock now',
    'Free delivery on orders over UGX 100,000',
    'Locally sourced fruit, veg & greens',
    'Shop 20 agricultural categories',
  ];

  @override
  State<PromoMarquee> createState() => _PromoMarqueeState();
}

class _PromoMarqueeState extends State<PromoMarquee> with SingleTickerProviderStateMixin {
  static const _duration = Duration(seconds: 35);

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

  Widget _phraseRow() {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < PromoMarquee.phrases.length; i++) ...[
          if (i > 0) const _DotSeparator(),
          Text(
            PromoMarquee.phrases[i],
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.textMuted,
            ),
          ),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: Container(
        height: 44,
        width: double.infinity,
        decoration: BoxDecoration(
          gradient: AppGradients.marquee,
          border: Border.all(color: AppColors.border.withValues(alpha: 0.7)),
        ),
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
                        KeyedSubtree(key: _loopKey, child: _phraseRow()),
                        _phraseRow(),
                      ],
                    ),
                  ),
                ),
              ),
              Positioned(
                left: 0,
                top: 0,
                bottom: 0,
                width: 20,
                child: IgnorePointer(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [const Color(0xFFEBF3DF), const Color(0xFFEBF3DF).withValues(alpha: 0)],
                      ),
                    ),
                  ),
                ),
              ),
              Positioned(
                right: 0,
                top: 0,
                bottom: 0,
                width: 20,
                child: IgnorePointer(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [const Color(0xFFEBF3DF).withValues(alpha: 0), const Color(0xFFEBF3DF)],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DotSeparator extends StatelessWidget {
  const _DotSeparator();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(horizontal: 16),
      child: Text('·', style: TextStyle(color: AppColors.accent, fontSize: 16, fontWeight: FontWeight.w700)),
    );
  }
}
