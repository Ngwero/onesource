import 'package:flutter/material.dart';

import '../config/theme.dart';

class OrderProgress extends StatelessWidget {
  const OrderProgress({
    super.key,
    required this.status,
    this.compact = false,
    this.vertical = false,
  });

  final String status;
  final bool compact;
  final bool vertical;

  static const _steps = [
    _Step('placed', 'Order processed', Icons.receipt_long_rounded),
    _Step('confirmed', 'Confirmed', Icons.local_shipping_outlined),
    _Step('packed', 'Packed', Icons.inventory_2_outlined),
    _Step('out_for_delivery', 'Out for delivery', Icons.delivery_dining_rounded),
    _Step('delivered', 'Delivered', Icons.check_circle_outline_rounded),
  ];

  int _activeIndex(String normalized) {
    if (normalized.contains('deliver') && !normalized.contains('out_for')) {
      return 4;
    }
    if (normalized.contains('out_for') || normalized.contains('dispatch')) return 3;
    if (normalized.contains('pack')) return 2;
    if (normalized.contains('confirm') || normalized.contains('ship')) return 1;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final normalized = status.toLowerCase().replaceAll(' ', '_');
    final active = _activeIndex(normalized);

    if (compact) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(4),
        child: LinearProgressIndicator(
          value: (active + 1) / _steps.length,
          minHeight: 4,
          backgroundColor: AppColors.muted,
          color: AppColors.darkGreen,
        ),
      );
    }

    if (vertical) {
      return Column(
        children: List.generate(_steps.length, (i) {
          final step = _steps[i];
          final done = i < active;
          final current = i == active;
          final isLast = i == _steps.length - 1;

          return IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Column(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: done || current ? AppColors.darkGreen : AppColors.muted,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        done ? Icons.check_rounded : step.icon,
                        size: 18,
                        color: done || current ? Colors.white : AppColors.textMuted,
                      ),
                    ),
                    if (!isLast)
                      Expanded(
                        child: Container(
                          width: 2,
                          margin: const EdgeInsets.symmetric(vertical: 4),
                          color: done ? AppColors.darkGreen : AppColors.border,
                        ),
                      ),
                  ],
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(bottom: isLast ? 0 : 22),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          step.label,
                          style: TextStyle(
                            fontWeight: current ? FontWeight.w800 : FontWeight.w600,
                            fontSize: 15,
                            color: current ? AppColors.darkGreen : AppColors.text,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _stepSubtitle(i, active),
                          style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        }),
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
                color: done ? AppColors.darkGreen : AppColors.textMuted,
              ),
              if (i < _steps.length - 1)
                Expanded(
                  child: Container(
                    height: 2,
                    color: done ? AppColors.darkGreen : AppColors.border,
                  ),
                ),
            ],
          ),
        );
      }),
    );
  }

  String _stepSubtitle(int index, int active) {
    if (index < active) return 'Completed';
    if (index == active) return 'In progress';
    return 'Pending';
  }
}

class _Step {
  const _Step(this.key, this.label, this.icon);
  final String key;
  final String label;
  final IconData icon;
}
