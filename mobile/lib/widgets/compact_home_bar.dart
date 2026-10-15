import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../utils/device_perf.dart';
import '../utils/shop_mode.dart';
import 'locale_currency_bar.dart';

/// Pins a slim header (logo, search, currency, language) over a home
/// scroll view once the full [HomeHeader] has scrolled out of view.
class CompactHomeBarOverlay extends StatefulWidget {
  const CompactHomeBarOverlay({
    super.key,
    required this.child,
    this.mode = ShopMode.fresh,
  });

  final Widget child;
  final ShopMode mode;

  @override
  State<CompactHomeBarOverlay> createState() => _CompactHomeBarOverlayState();
}

class _CompactHomeBarOverlayState extends State<CompactHomeBarOverlay> {
  // Hysteresis so the bar doesn't flicker around a single threshold.
  static const _showAfter = 210.0;
  static const _hideBelow = 170.0;

  bool _visible = false;

  bool _onScroll(ScrollNotification n) {
    if (n.depth != 0 || n.metrics.axis != Axis.vertical) return false;
    final y = n.metrics.pixels;
    final next = _visible ? y > _hideBelow : y > _showAfter;
    if (next != _visible) setState(() => _visible = next);
    return false;
  }

  @override
  Widget build(BuildContext context) {
    return NotificationListener<ScrollNotification>(
      onNotification: _onScroll,
      child: Stack(
        children: [
          widget.child,
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: IgnorePointer(
              ignoring: !_visible,
              child: AnimatedSlide(
                offset: _visible ? Offset.zero : const Offset(0, -1),
                duration: const Duration(milliseconds: 220),
                curve: Curves.easeOutCubic,
                child: AnimatedOpacity(
                  opacity: _visible ? 1 : 0,
                  duration: const Duration(milliseconds: 180),
                  child: CompactHomeBar(mode: widget.mode),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class CompactHomeBar extends ConsumerWidget {
  const CompactHomeBar({super.key, this.mode = ShopMode.fresh});

  final ShopMode mode;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hint = ref.watch(stringsProvider).get(mode.searchHintKey);
    final topPad = MediaQuery.paddingOf(context).top;
    final bar = DecoratedBox(
      decoration: const BoxDecoration(
        color: Color(0xC7FAF9F6),
        border: Border(
          bottom: BorderSide(color: AppColors.border),
        ),
      ),
      child: Padding(
        padding: EdgeInsets.fromLTRB(12, topPad + 6, 8, 8),
        child: Row(
          children: [
            InkWell(
              customBorder: const CircleBorder(),
              onTap: () => context.go(mode.homePath),
              child: const _CompactLogo(),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Material(
                color: const Color(0xB8FFFFFF),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(999),
                  side: const BorderSide(color: AppColors.border),
                ),
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: () => context.push(mode.searchPath),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.search_rounded,
                          size: 18,
                          color: AppColors.darkGreen.withValues(alpha: 0.8),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            hint,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColors.textMuted,
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              letterSpacing: -0.15,
                              height: 1.2,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 6),
            const LocaleCurrencyBar(flagsOnly: true),
          ],
        ),
      ),
    );

    final frosted = reduceMotionForDevice
        ? bar
        : ClipRect(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
              child: bar,
            ),
          );

    return DecoratedBox(
      decoration: const BoxDecoration(
        boxShadow: [
          BoxShadow(
            color: Color(0x142E5E4A),
            blurRadius: 18,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: frosted,
    );
  }
}

class _CompactLogo extends StatelessWidget {
  const _CompactLogo();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.border),
      ),
      child: const SizedBox(
        width: 32,
        height: 32,
        child: Padding(
          padding: EdgeInsets.all(5),
          child: Image(
            image: AssetImage('assets/brand/logo-primary.png'),
            fit: BoxFit.contain,
          ),
        ),
      ),
    );
  }
}
