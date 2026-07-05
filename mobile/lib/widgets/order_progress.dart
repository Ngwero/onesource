import 'package:flutter/material.dart';

import '../config/theme.dart';

class OrderProgress extends StatelessWidget {
  const OrderProgress({super.key, required this.status, this.compact = false});

  final String status;
  final bool compact;

  static const _steps = ['placed', 'confirmed', 'out_for_delivery', 'delivered'];

  @override
  Widget build(BuildContext context) {
    final normalized = status.toLowerCase().replaceAll(' ', '_');
    final currentIndex = _steps.indexWhere((s) => normalized.contains(s.split('_').last));
    final active = currentIndex < 0 ? 0 : currentIndex;

    if (compact) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(4),
        child: LinearProgressIndicator(
          value: (active + 1) / _steps.length,
          minHeight: 4,
          backgroundColor: AppColors.muted,
          color: AppColors.accent,
        ),
      );
    }

    return Row(
      children: List.generate(_steps.length, (i) {
        final done = i <= active;
        return Expanded(
          child: Row(
            children: [
              Icon(
                done ? Icons.check_circle : Icons.circle_outlined,
                size: 16,
                color: done ? AppColors.accent : AppColors.textMuted,
              ),
              if (i < _steps.length - 1)
                Expanded(child: Container(height: 2, color: done ? AppColors.accent : AppColors.border)),
            ],
          ),
        );
      }),
    );
  }
}
