import 'package:flutter/material.dart';

import '../config/theme.dart';

/// Two-step login: credentials → OTP (matches web).
class AuthStepIndicator extends StatelessWidget {
  const AuthStepIndicator({super.key, required this.otpStep});

  final bool otpStep;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _StepChip(label: 'Sign in', active: !otpStep, complete: otpStep),
        Expanded(
          child: Container(
            height: 2,
            margin: const EdgeInsets.symmetric(horizontal: 8),
            decoration: BoxDecoration(
              color: otpStep ? AppColors.darkGreen : AppColors.border,
              borderRadius: BorderRadius.circular(999),
            ),
          ),
        ),
        _StepChip(label: 'Verify code', active: otpStep, complete: false),
      ],
    );
  }
}

class _StepChip extends StatelessWidget {
  const _StepChip({
    required this.label,
    required this.active,
    required this.complete,
  });

  final String label;
  final bool active;
  final bool complete;

  @override
  Widget build(BuildContext context) {
    final color = active || complete ? AppColors.darkGreen : AppColors.textMuted;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 24,
          height: 24,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: active || complete
                ? AppColors.accentLight
                : AppColors.muted,
            shape: BoxShape.circle,
          ),
          child: Text(
            complete ? '✓' : (active ? '2' : '1'),
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: color,
          ),
        ),
      ],
    );
  }
}
