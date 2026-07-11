import 'package:flutter/material.dart';

import '../config/theme.dart';

int scorePassword(String password) {
  if (password.isEmpty) return 0;
  if (password.length < 6) return 0;

  var score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (RegExp(r'[a-z]').hasMatch(password) && RegExp(r'[A-Z]').hasMatch(password)) {
    score++;
  }
  if (RegExp(r'\d').hasMatch(password)) score++;
  if (RegExp(r'[^A-Za-z0-9]').hasMatch(password)) score++;

  if (score <= 1) return 1;
  if (score == 2) return 2;
  if (score == 3) return 3;
  return 4;
}

String passwordStrengthLabel(int strength) {
  switch (strength) {
    case 0:
      return 'Use at least 6 characters.';
    case 1:
      return 'Weak — add uppercase, numbers, or symbols.';
    case 2:
      return 'Fair — try a longer password with numbers.';
    case 3:
      return 'Good password.';
    default:
      return 'Strong password.';
  }
}

class PasswordStrengthMeter extends StatelessWidget {
  const PasswordStrengthMeter({super.key, required this.password});

  final String password;

  @override
  Widget build(BuildContext context) {
    if (password.isEmpty) return const SizedBox.shrink();

    final strength = scorePassword(password);
    final barLevel = strength == 0 ? 1 : strength;
    final widths = {1: 0.25, 2: 0.5, 3: 0.75, 4: 1.0};
    final colors = {
      1: const Color(0xFFC0392B),
      2: const Color(0xFFD4A017),
      3: AppColors.darkGreen,
      4: const Color(0xFF1A3D30),
    };

    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: widths[barLevel],
              minHeight: 4,
              backgroundColor: AppColors.border,
              color: colors[barLevel],
            ),
          ),
          const SizedBox(height: 6),
          Text(
            passwordStrengthLabel(strength),
            style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
          ),
        ],
      ),
    );
  }
}
