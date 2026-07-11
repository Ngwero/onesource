import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/theme.dart';
import '../currency/currencies.dart';
import '../i18n/app_strings.dart';
import '../i18n/languages.dart';
import '../providers/currency_provider.dart';
import '../providers/locale_provider.dart';

class LocaleCurrencyBar extends ConsumerWidget {
  const LocaleCurrencyBar({super.key, this.onDark = false});

  final bool onDark;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final language = ref.watch(localeProvider);
    final currency = ref.watch(currencyProvider);
    final lang = languageInfo(language);
    final curr = currencyInfo(currency.currency);

    return Row(
      children: [
        Expanded(
          child: _SwitcherChip(
            onDark: onDark,
            flag: lang.flag,
            label: lang.nativeName,
            onTap: () => _showLanguageSheet(context, ref, strings),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _SwitcherChip(
            onDark: onDark,
            flag: curr.flag,
            label: currencyCodeLabel(curr.code),
            loading: currency.loading,
            onTap: () => _showCurrencySheet(context, ref, strings),
          ),
        ),
      ],
    );
  }

  void _showLanguageSheet(BuildContext context, WidgetRef ref, AppStrings strings) {
    final current = ref.read(localeProvider);
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(strings.langSelect, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
              const SizedBox(height: 12),
              ...languages.map((lang) {
                final selected = lang.code == current;
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Text(lang.flag, style: const TextStyle(fontSize: 24)),
                  title: Text(lang.nativeName, style: const TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: Text(strings.langName(languageCodeLabel(lang.code))),
                  trailing: selected ? const Icon(Icons.check_circle, color: AppColors.darkGreen) : null,
                  onTap: () {
                    ref.read(localeProvider.notifier).setLanguage(lang.code);
                    Navigator.pop(context);
                  },
                );
              }),
            ],
          ),
        ),
      ),
    );
  }

  void _showCurrencySheet(BuildContext context, WidgetRef ref, AppStrings strings) {
    final state = ref.read(currencyProvider);
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(strings.currencySelect, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
              const SizedBox(height: 12),
              ...currencies.map((info) {
                final selected = info.code == state.currency;
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Text(info.flag, style: const TextStyle(fontSize: 24)),
                  title: Text(strings.currencyName(info.nameKey), style: const TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: Text('${currencyCodeLabel(info.code)} · ${info.symbol}'),
                  trailing: selected ? const Icon(Icons.check_circle, color: AppColors.darkGreen) : null,
                  onTap: () {
                    ref.read(currencyProvider.notifier).setCurrency(info.code);
                    Navigator.pop(context);
                  },
                );
              }),
              const SizedBox(height: 8),
              Text(
                strings.liveRates,
                style: const TextStyle(fontSize: 12, color: AppColors.textMuted, height: 1.4),
              ),
              TextButton(
                onPressed: () => ref.read(currencyProvider.notifier).refreshRates(),
                child: Text(strings.refreshRates),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SwitcherChip extends StatelessWidget {
  const _SwitcherChip({
    required this.onDark,
    required this.flag,
    required this.label,
    required this.onTap,
    this.loading = false,
  });

  final bool onDark;
  final String flag;
  final String label;
  final VoidCallback onTap;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: onDark ? Colors.white.withValues(alpha: 0.14) : Colors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            children: [
              Text(flag, style: const TextStyle(fontSize: 18)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    color: onDark ? Colors.white : AppColors.text,
                  ),
                ),
              ),
              if (loading)
                const SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.lemonGreen),
                )
              else
                Icon(
                  Icons.expand_more_rounded,
                  size: 18,
                  color: onDark ? Colors.white70 : AppColors.textMuted,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
