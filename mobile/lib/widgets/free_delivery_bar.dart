import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/theme.dart';
import '../providers/currency_provider.dart';
import '../services/checkout.dart';

class FreeDeliveryBar extends ConsumerWidget {
  const FreeDeliveryBar({super.key, required this.subtotal});

  final double subtotal;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final formatPrice = ref.watch(formatPriceProvider);

    if (subtotal >= freeDeliveryThresholdUgx) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              AppColors.leafPale,
              AppColors.lemonGreen.withValues(alpha: 0.35),
            ],
          ),
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Row(
          children: [
            Icon(Icons.bolt_rounded, color: AppColors.darkGreen, size: 20),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Free delivery unlocked',
                style: TextStyle(
                  fontFamily: 'Gabarito',
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                  color: AppColors.darkGreen,
                ),
              ),
            ),
          ],
        ),
      );
    }

    final remainingUgx = freeDeliveryThresholdUgx - subtotal;
    final progress = (subtotal / freeDeliveryThresholdUgx).clamp(0.0, 1.0);

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border.withValues(alpha: 0.7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.local_shipping_outlined,
                size: 18,
                color: AppColors.darkGreen,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Add ${formatPrice(remainingUgx)} for free delivery',
                  style: const TextStyle(
                    fontFamily: 'Gabarito',
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.2,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 7,
              backgroundColor: AppColors.muted,
              color: AppColors.darkGreen,
            ),
          ),
        ],
      ),
    );
  }
}
