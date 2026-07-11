import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import 'home_search_bar.dart';
import 'locale_currency_bar.dart';

/// Dark curved header with welcome row + search (grocery-app style).
class HomeHeader extends ConsumerWidget {
  const HomeHeader({
    super.key,
    required this.name,
    required this.onAccount,
  });

  final String name;
  final VoidCallback onAccount;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final topPad = MediaQuery.paddingOf(context).top;

    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(20, topPad + 8, 20, 24),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF244A3B), AppColors.darkGreen, Color(0xFF3A7359)],
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(32)),
        boxShadow: [
          BoxShadow(
            color: Color(0x332E5E4A),
            blurRadius: 24,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white.withValues(alpha: 0.35), width: 2),
                  gradient: AppGradients.lemonAccent,
                ),
                alignment: Alignment.center,
                child: Text(
                  name.isNotEmpty ? name[0].toUpperCase() : '?',
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    color: AppColors.text,
                    fontSize: 18,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      strings.greetingForTime(),
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.white.withValues(alpha: 0.78),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Text(
                      name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
              Material(
                color: Colors.white.withValues(alpha: 0.14),
                shape: const CircleBorder(),
                child: InkWell(
                  onTap: onAccount,
                  customBorder: const CircleBorder(),
                  child: const SizedBox(
                    width: 44,
                    height: 44,
                    child: Icon(Icons.notifications_none_rounded, color: Colors.white, size: 22),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          const LocaleCurrencyBar(onDark: true),
          const SizedBox(height: 14),
          const HomeSearchBar(onDark: true),
        ],
      ),
    );
  }
}
