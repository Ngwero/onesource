import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';

/// Animated Fresh ↔ Kitchen shop switch.
class ShopModeSwitch extends StatelessWidget {
  const ShopModeSwitch({
    super.key,
    required this.kitchenMode,
    this.onDark = false,
  });

  final bool kitchenMode;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    return _ShopModeToggle(
      kitchenMode: kitchenMode,
      onDark: onDark,
      onFresh: () {
        if (kitchenMode) context.go('/home');
      },
      onKitchen: () {
        if (!kitchenMode) context.go('/kitchen');
      },
    );
  }
}

class _ShopModeToggle extends StatelessWidget {
  const _ShopModeToggle({
    required this.kitchenMode,
    required this.onDark,
    required this.onFresh,
    required this.onKitchen,
  });

  final bool kitchenMode;
  final bool onDark;
  final VoidCallback onFresh;
  final VoidCallback onKitchen;

  @override
  Widget build(BuildContext context) {
    final track = onDark
        ? Colors.white.withValues(alpha: 0.08)
        : const Color(0xFFE8E6DF);
    final border = onDark
        ? Colors.white.withValues(alpha: 0.1)
        : AppColors.border.withValues(alpha: 0.7);

    // Fresh = leaf green; Kitchen = warm amber metal
    final thumbGradient = kitchenMode
        ? const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFF5D76E), AppColors.amber, Color(0xFFE0B83A)],
          )
        : onDark
            ? const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFFC6DB6E), AppColors.lemonGreen, Color(0xFF8FB84A)],
              )
            : const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF3A7359), AppColors.darkGreen, Color(0xFF244A3B)],
              );

    final thumbFg = kitchenMode
        ? AppColors.text
        : (onDark ? const Color(0xFF1C3D30) : Colors.white);
    final idleFg = onDark
        ? Colors.white.withValues(alpha: 0.72)
        : AppColors.textMuted;

    return Semantics(
      label: 'Shop mode',
      value: kitchenMode ? 'Kitchen' : 'Fresh',
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
            final thumbWidth = (constraints.maxWidth - 8) / 2;
            return Stack(
              children: [
                AnimatedAlign(
                  duration: const Duration(milliseconds: 280),
                  curve: Curves.easeOutCubic,
                  alignment:
                      kitchenMode ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    width: thumbWidth,
                    height: double.infinity,
                    decoration: BoxDecoration(
                      gradient: thumbGradient,
                      borderRadius: BorderRadius.circular(999),
                      boxShadow: [
                        BoxShadow(
                          color: (kitchenMode ? AppColors.amber : AppColors.darkGreen)
                              .withValues(alpha: onDark ? 0.35 : 0.22),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                  ),
                ),
                Row(
                  children: [
                    Expanded(
                      child: _SwitchHit(
                        selected: !kitchenMode,
                        selectedColor: thumbFg,
                        idleColor: idleFg,
                        icon: Icons.eco_rounded,
                        label: 'Fresh',
                        onTap: onFresh,
                      ),
                    ),
                    Expanded(
                      child: _SwitchHit(
                        selected: kitchenMode,
                        selectedColor: thumbFg,
                        idleColor: idleFg,
                        icon: Icons.kitchen_outlined,
                        label: 'Kitchen',
                        onTap: onKitchen,
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
              fontSize: 13.5,
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
                  child: Icon(icon, size: 17, color: color),
                ),
                const SizedBox(width: 6),
                Text(label),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
