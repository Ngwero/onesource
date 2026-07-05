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
    final btnSize = compact ? 32.0 : 36.0;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.muted,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _StepBtn(
            size: btnSize,
            icon: Icons.remove,
            onTap: quantity > min ? () => onChanged(quantity - 1) : null,
          ),
          Padding(
            padding: EdgeInsets.symmetric(horizontal: compact ? 8 : 12),
            child: Text(
              '$quantity',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: compact ? 14 : 15),
            ),
          ),
          _StepBtn(
            size: btnSize,
            icon: Icons.add,
            onTap: quantity < max ? () => onChanged(quantity + 1) : null,
          ),
        ],
      ),
    );
  }
}

class _StepBtn extends StatelessWidget {
  const _StepBtn({required this.size, required this.icon, required this.onTap});

  final double size;
  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: SizedBox(
          width: size,
          height: size,
          child: Icon(icon, size: 18, color: onTap == null ? AppColors.textMuted : AppColors.text),
        ),
      ),
    );
  }
}
