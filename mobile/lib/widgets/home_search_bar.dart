import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';

class HomeSearchBar extends StatelessWidget {
  const HomeSearchBar({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppColors.pillRadius),
        boxShadow: softCardShadow,
        border: Border.all(color: AppColors.border.withValues(alpha: 0.5)),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(AppColors.pillRadius),
          onTap: () => context.push('/search'),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
            child: Row(
              children: [
                const SizedBox(width: 12),
                const Icon(Icons.search, color: AppColors.textMuted, size: 22),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text(
                    'Search fresh produce…',
                    style: TextStyle(color: AppColors.textMuted, fontSize: 15),
                  ),
                ),
                DecoratedBox(
                  decoration: const BoxDecoration(
                    gradient: AppGradients.searchAccent,
                    shape: BoxShape.circle,
                  ),
                  child: Material(
                    color: Colors.transparent,
                    shape: const CircleBorder(),
                    child: InkWell(
                      onTap: () => context.push('/search'),
                      customBorder: const CircleBorder(),
                      child: const SizedBox(
                        width: 42,
                        height: 42,
                        child: Icon(Icons.tune_rounded, color: Colors.white, size: 20),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
