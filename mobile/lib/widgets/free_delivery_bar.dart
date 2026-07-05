import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../config/theme.dart';
import '../services/checkout.dart';

final _currency = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);

class FreeDeliveryBar extends StatelessWidget {
  const FreeDeliveryBar({super.key, required this.subtotal});

  final double subtotal;

  @override
  Widget build(BuildContext context) {
    if (subtotal >= freeDeliveryThresholdUgx) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.accentLight,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.accent.withValues(alpha: 0.3)),
        ),
        child: const Row(
          children: [
            Icon(Icons.local_shipping_outlined, color: AppColors.accent, size: 20),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'You qualify for FREE delivery!',
                style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.accent),
              ),
            ),
          ],
        ),
      );
    }

    final remaining = freeDeliveryThresholdUgx - subtotal;
    final progress = (subtotal / freeDeliveryThresholdUgx).clamp(0.0, 1.0);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Add ${_currency.format(remaining)} more for FREE delivery',
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 6,
              backgroundColor: AppColors.muted,
              color: AppColors.accent,
            ),
          ),
        ],
      ),
    );
  }
}
