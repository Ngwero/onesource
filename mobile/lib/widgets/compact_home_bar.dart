import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../utils/shop_mode.dart';
import 'brand_logo.dart';
import 'deliver_to_picker.dart';
import 'home_header.dart';
import 'locale_currency_bar.dart';

/// Pins a compact header (logo, search, country, currency, language) over a home
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

    return Material(
      color: homeHeaderColor(mode),
      elevation: 6,
      shadowColor: Colors.black.withValues(alpha: 0.3),
      borderRadius: const BorderRadius.vertical(bottom: Radius.circular(18)),
      child: Padding(
        padding: EdgeInsets.fromLTRB(14, topPad + 8, 14, 10),
        child: Row(
          children: [
            InkWell(
              customBorder: const CircleBorder(),
              onTap: () => context.go(mode.homePath),
              child: const BrandLogoMark(size: 36),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Material(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: () => context.push(mode.searchPath),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.search_rounded,
                          size: 20,
                          color: AppColors.darkGreen.withValues(alpha: 0.9),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            hint,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColors.textMuted,
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            const DeliveryCountryFlagButton(onDark: true),
            const SizedBox(width: 6),
            const LocaleCurrencyBar(onDark: true, flagsOnly: true),
          ],
        ),
      ),
    );
  }
}
