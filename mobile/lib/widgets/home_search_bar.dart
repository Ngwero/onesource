import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';

class HomeSearchBar extends ConsumerWidget {
  const HomeSearchBar({super.key, this.onDark = false});

  final bool onDark;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hint = ref.watch(stringsProvider).searchHint;
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: onDark
            ? [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.12),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ]
            : softCardShadow,
        border: onDark ? null : Border.all(color: AppColors.border.withValues(alpha: 0.5)),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () => context.push('/search'),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            child: Row(
              children: [
                Icon(Icons.search, color: AppColors.textMuted.withValues(alpha: 0.9), size: 22),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    hint,
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 15),
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
