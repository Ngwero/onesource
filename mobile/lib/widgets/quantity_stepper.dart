import 'package:flutter/material.dart';

import '../config/theme.dart';

class QuantityStepper extends StatelessWidget {
  const QuantityStepper({
    super.key,
    required this.quantity,
    required this.onChanged,
    this.min = 0,
    this.max = 99,
    this.compact = false,
  });

  final int quantity;
  final int min;
  final int max;
  final bool compact;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final btnSize = compact ? 30.0 : 36.0;

    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: AppColors.leafPale,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _StepBtn(
            size: btnSize,
            icon: Icons.remove_rounded,
            filled: false,
            onTap: quantity > min ? () => onChanged(quantity - 1) : null,
          ),
          Padding(
            padding: EdgeInsets.symmetric(horizontal: compact ? 10 : 14),
            child: Text(
              '$quantity',
              style: TextStyle(
                fontFamily: 'Gabarito',
                fontWeight: FontWeight.w800,
                fontSize: compact ? 14 : 15,
                color: AppColors.darkGreen,
              ),
            ),
          ),
          _StepBtn(
            size: btnSize,
            icon: Icons.add_rounded,
            filled: true,
            onTap: quantity < max ? () => onChanged(quantity + 1) : null,
          ),
        ],
      ),
    );
  }
}

class _StepBtn extends StatelessWidget {
  const _StepBtn({
    required this.size,
    required this.icon,
    required this.filled,
    required this.onTap,
  });

  final double size;
  final IconData icon;
  final bool filled;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final enabled = onTap != null;
    return Material(
      color: filled && enabled
          ? AppColors.darkGreen
          : Colors.white.withValues(alpha: enabled ? 1 : 0.5),
      shape: const CircleBorder(),
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: SizedBox(
          width: size,
          height: size,
          child: Icon(
            icon,
            size: 16,
            color: filled && enabled
                ? Colors.white
                : (enabled ? AppColors.darkGreen : AppColors.textMuted),
          ),
        ),
      ),
    );
  }
}
