import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/theme.dart';
import '../currency/currencies.dart';
import '../i18n/app_strings.dart';
import '../i18n/languages.dart';
import '../providers/currency_provider.dart';
import '../providers/locale_provider.dart';
import 'sheet_option_tile.dart';

class LocaleCurrencyBar extends ConsumerWidget {
  const LocaleCurrencyBar({
    super.key,
    this.onDark = false,
    this.compact = false,
    this.flagsOnly = false,
  });

  final bool onDark;
  final bool compact;

  /// Smallest form (pinned compact header): flag pills without labels.
  final bool flagsOnly;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final language = ref.watch(localeProvider);
    final currency = ref.watch(currencyProvider);
    final lang = languageInfo(language);
    final curr = currencyInfo(currency.currency);

    if (flagsOnly) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _FlagButton(
            onDark: onDark,
            flag: curr.flag,
            tooltip: strings.currencySelect,
            loading: currency.loading,
            onTap: () =>
                showCurrencySheet(context, ProviderScope.containerOf(context)),
          ),
          const SizedBox(width: 6),
          _FlagButton(
            onDark: onDark,
            flag: lang.flag,
            tooltip: strings.langSelect,
            onTap: () =>
                showLanguageSheet(context, ProviderScope.containerOf(context)),
          ),
        ],
      );
    }

    if (compact) {
      return Row(
        children: [
          _CompactChip(
            onDark: onDark,
            flag: lang.flag,
            label: lang.nativeName,
            onTap: () =>
                showLanguageSheet(context, ProviderScope.containerOf(context)),
          ),
          const SizedBox(width: 8),
          _CompactChip(
            onDark: onDark,
            flag: curr.flag,
            label: currencyCodeLabel(curr.code),
            loading: currency.loading,
            onTap: () =>
                showCurrencySheet(context, ProviderScope.containerOf(context)),
          ),
        ],
      );
    }

    return Row(
      children: [
        Expanded(
          child: _SwitcherChip(
            onDark: onDark,
            flag: lang.flag,
            label: lang.nativeName,
            onTap: () =>
                showLanguageSheet(context, ProviderScope.containerOf(context)),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _SwitcherChip(
            onDark: onDark,
            flag: curr.flag,
            label: currencyCodeLabel(curr.code),
            loading: currency.loading,
            onTap: () =>
                showCurrencySheet(context, ProviderScope.containerOf(context)),
          ),
        ),
      ],
    );
  }
}

/// Bottom sheets otherwise stop at 9/16 of the screen and paint an overflow
/// band over the last rows, which then ignore taps.
Widget _pickerSheet(BuildContext context, {required List<Widget> children}) {
  final maxHeight = MediaQuery.sizeOf(context).height * 0.92;
  return SafeArea(
    top: false,
    child: ConstrainedBox(
      constraints: BoxConstraints(maxHeight: maxHeight),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: children,
        ),
      ),
    ),
  );
}

void showLanguageSheet(BuildContext context, ProviderContainer container) {
  final strings = container.read(stringsProvider);
  final current = container.read(localeProvider);
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    clipBehavior: Clip.antiAlias,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (context) => _pickerSheet(
      context,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
          child: Text(strings.langSelect,
              style:
                  const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        ),
        for (final lang in languages)
          SheetOptionTile(
            leading: Text(lang.flag, style: const TextStyle(fontSize: 24)),
            title: lang.nativeName,
            subtitle: strings.langName(languageCodeLabel(lang.code)),
            selected: lang.code == current,
            onTap: () {
              container.read(localeProvider.notifier).setLanguage(lang.code);
              Navigator.pop(context);
            },
          ),
        const SizedBox(height: 8),
      ],
    ),
  );
}

void showCurrencySheet(BuildContext context, ProviderContainer container) {
  final strings = container.read(stringsProvider);
  final state = container.read(currencyProvider);
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    clipBehavior: Clip.antiAlias,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (context) => _pickerSheet(
      context,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
          child: Text(strings.currencySelect,
              style:
                  const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        ),
        for (final info in currencies)
          SheetOptionTile(
            leading: Text(info.flag, style: const TextStyle(fontSize: 24)),
            title: strings.currencyName(info.nameKey),
            subtitle: '${currencyCodeLabel(info.code)} · ${info.symbol}',
            selected: info.code == state.currency,
            onTap: () {
              container.read(currencyProvider.notifier).setCurrency(info.code);
              Navigator.pop(context);
            },
          ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                strings.liveRates,
                style: const TextStyle(
                    fontSize: 12, color: AppColors.textMuted, height: 1.4),
              ),
              TextButton(
                style: TextButton.styleFrom(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 0, vertical: 12),
                  minimumSize: const Size(48, 48),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  alignment: Alignment.centerLeft,
                ),
                onPressed: () =>
                    container.read(currencyProvider.notifier).refreshRates(),
                child: Text(strings.refreshRates),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class _FlagButton extends StatelessWidget {
  const _FlagButton({
    required this.onDark,
    required this.flag,
    required this.tooltip,
    required this.onTap,
    this.loading = false,
  });

  final bool onDark;
  final String flag;
  final String tooltip;
  final VoidCallback onTap;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: onDark ? Colors.white.withValues(alpha: 0.12) : Colors.white,
        shape: CircleBorder(
          side: BorderSide(
            color: onDark
                ? Colors.white.withValues(alpha: 0.18)
                : AppColors.border.withValues(alpha: 0.6),
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: SizedBox(
            width: 40,
            height: 40,
            child: Center(
              child: loading
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(
                        strokeWidth: 1.8,
                        color: AppColors.lemonGreen,
                      ),
                    )
                  : Text(flag, style: const TextStyle(fontSize: 18)),
            ),
          ),
        ),
      ),
    );
  }
}

class _CompactChip extends StatelessWidget {
  const _CompactChip({
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
      color: onDark ? Colors.white.withValues(alpha: 0.1) : Colors.white,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          padding: const EdgeInsets.fromLTRB(10, 7, 8, 7),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: onDark
                  ? Colors.white.withValues(alpha: 0.12)
                  : AppColors.border.withValues(alpha: 0.6),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(flag, style: const TextStyle(fontSize: 14)),
              const SizedBox(width: 6),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 88),
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                    color: onDark ? Colors.white : AppColors.text,
                  ),
                ),
              ),
              const SizedBox(width: 2),
              if (loading)
                const SizedBox(
                  width: 12,
                  height: 12,
                  child: CircularProgressIndicator(
                    strokeWidth: 1.8,
                    color: AppColors.lemonGreen,
                  ),
                )
              else
                Icon(
                  Icons.keyboard_arrow_down_rounded,
                  size: 16,
                  color: onDark ? Colors.white70 : AppColors.textMuted,
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
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: AppColors.lemonGreen),
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
