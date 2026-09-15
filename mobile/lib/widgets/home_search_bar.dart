import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';

class HomeSearchBar extends ConsumerWidget {
  const HomeSearchBar({
    super.key,
    this.onDark = false,
    this.kitchenMode = false,
  });

  final bool onDark;
  final bool kitchenMode;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hint = kitchenMode
        ? 'Search pots, pans, utensils…'
        : ref.watch(stringsProvider).searchHint;
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        boxShadow: onDark
            ? [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.16),
                  blurRadius: 24,
                  offset: const Offset(0, 10),
                ),
                BoxShadow(
                  color: AppColors.darkGreen.withValues(alpha: 0.08),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ]
            : softCardShadow,
        border: onDark
            ? Border.all(color: Colors.white.withValues(alpha: 0.9))
            : Border.all(color: AppColors.border.withValues(alpha: 0.5)),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(22),
          onTap: () => context.push(kitchenMode ? '/kitchen/search' : '/search'),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 15, 12, 15),
            child: Row(
              children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: AppColors.leafPale,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  alignment: Alignment.center,
                  child: Icon(
                    Icons.search_rounded,
                    color: AppColors.darkGreen.withValues(alpha: 0.9),
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    hint,
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                Icon(
                  Icons.tune_rounded,
                  size: 20,
                  color: AppColors.textMuted.withValues(alpha: 0.7),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
