import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../utils/shop_mode.dart';

/// Animated Fresh ↔ Kitchen ↔ Cosmetics shop switch.
class ShopModeSwitch extends StatelessWidget {
  const ShopModeSwitch({
    super.key,
    required this.mode,
    this.onDark = false,
  });

  final ShopMode mode;
  final bool onDark;

  static const _cosmeticsPink = Color(0xFFD9719A);

  @override
  Widget build(BuildContext context) {
    final s = context.tr;
    final track = onDark
        ? Colors.white.withValues(alpha: 0.08)
        : const Color(0xFFE8E6DF);
    final border = onDark
        ? Colors.white.withValues(alpha: 0.1)
        : AppColors.border.withValues(alpha: 0.7);

    final (List<Color> thumbColors, Color glow) = switch (mode) {
      ShopMode.kitchen => (
          const [Color(0xFFF5D76E), AppColors.amber, Color(0xFFE0B83A)],
          AppColors.amber,
        ),
      ShopMode.cosmetics => (
          const [Color(0xFFF2A7C3), _cosmeticsPink, Color(0xFFC25480)],
          _cosmeticsPink,
        ),
      ShopMode.fresh => onDark
          ? (
              const [Color(0xFFC6DB6E), AppColors.lemonGreen, Color(0xFF8FB84A)],
              AppColors.darkGreen,
            )
          : (
              const [Color(0xFF3A7359), AppColors.darkGreen, Color(0xFF244A3B)],
              AppColors.darkGreen,
            ),
    };

    final thumbFg = switch (mode) {
      ShopMode.kitchen => AppColors.text,
      ShopMode.cosmetics => Colors.white,
      ShopMode.fresh => onDark ? const Color(0xFF1C3D30) : Colors.white,
    };
    final idleFg = onDark
        ? Colors.white.withValues(alpha: 0.72)
        : AppColors.textMuted;

    final segments = <(ShopMode, IconData, String)>[
      (ShopMode.fresh, Icons.eco_rounded, s.or('app.shop.fresh', 'Fresh')),
      (ShopMode.kitchen, Icons.kitchen_outlined, s.or('app.shop.kitchen', 'Kitchen')),
      (ShopMode.cosmetics, Icons.spa_outlined, s.or('app.shop.beauty', 'Beauty')),
    ];
    final index = segments.indexWhere((e) => e.$1 == mode);

    return Semantics(
      label: s.get('header.shopSwitcherLabel'),
      value: segments[index].$3,
      child: Container(
        height: 48,
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: track,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: border),
        ),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final thumbWidth = (constraints.maxWidth - 8) / segments.length;
            return Stack(
              children: [
                AnimatedAlign(
                  duration: const Duration(milliseconds: 280),
                  curve: Curves.easeOutCubic,
                  alignment: Alignment(-1 + 2 * index / (segments.length - 1), 0),
                  child: Container(
                    width: thumbWidth,
                    height: double.infinity,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: thumbColors,
                      ),
                      borderRadius: BorderRadius.circular(999),
                      boxShadow: [
                        BoxShadow(
                          color: glow.withValues(alpha: onDark ? 0.35 : 0.22),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                  ),
                ),
                Row(
                  children: [
                    for (final (segMode, icon, label) in segments)
                      Expanded(
                        child: _SwitchHit(
                          selected: segMode == mode,
                          selectedColor: thumbFg,
                          idleColor: idleFg,
                          icon: icon,
                          label: label,
                          onTap: () {
                            if (segMode != mode) context.go(segMode.homePath);
                          },
                        ),
                      ),
                  ],
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _SwitchHit extends StatelessWidget {
  const _SwitchHit({
    required this.selected,
    required this.selectedColor,
    required this.idleColor,
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final bool selected;
  final Color selectedColor;
  final Color idleColor;
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = selected ? selectedColor : idleColor;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        splashColor: Colors.white.withValues(alpha: 0.12),
        highlightColor: Colors.white.withValues(alpha: 0.06),
        child: Center(
          child: AnimatedDefaultTextStyle(
            duration: const Duration(milliseconds: 200),
            style: TextStyle(
              fontFamily: 'Gabarito',
              fontSize: 13,
              fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
              color: color,
              letterSpacing: selected ? -0.2 : 0,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                AnimatedScale(
                  scale: selected ? 1.05 : 1,
                  duration: const Duration(milliseconds: 220),
                  curve: Curves.easeOut,
                  child: Icon(icon, size: 16, color: color),
                ),
                const SizedBox(width: 5),
                Flexible(
                  child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
