import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../i18n/country_defaults.dart';
import '../providers/delivery_country_provider.dart';
import 'country_flag.dart';
import 'sheet_option_tile.dart';

/// "Deliver to 🇺🇬 Uganda ▾" — opens the delivery country picker.
class DeliverToChip extends ConsumerWidget {
  const DeliverToChip({super.key, this.onDark = false});

  final bool onDark;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final code = ref.watch(deliveryCountryProvider);
    final muted = onDark ? Colors.white70 : AppColors.textMuted;
    final label = strings.get('header.deliverTo');
    final name = strings.countryName(code);

    return Semantics(
      button: true,
      label: '$label $name',
      excludeSemantics: true,
      child: InkWell(
        onTap: () => showDeliveryCountrySheet(context),
        borderRadius: BorderRadius.circular(999),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.location_on_outlined, size: 15, color: muted),
              const SizedBox(width: 4),
              Text(label, style: TextStyle(fontSize: 12, color: muted)),
              const SizedBox(width: 6),
              CountryFlag(code: code, size: 16),
              const SizedBox(width: 5),
              Flexible(
                child: Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    color: onDark ? Colors.white : AppColors.text,
                  ),
                ),
              ),
              Icon(Icons.keyboard_arrow_down_rounded, size: 16, color: muted),
            ],
          ),
        ),
      ),
    );
  }
}

/// Round flag-only button for the pinned compact header.
class DeliveryCountryFlagButton extends ConsumerWidget {
  const DeliveryCountryFlagButton({super.key, this.onDark = false});

  final bool onDark;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final code = ref.watch(deliveryCountryProvider);
    return Tooltip(
      message:
          '${strings.get('header.deliverTo')} ${strings.countryName(code)}',
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
          onTap: () => showDeliveryCountrySheet(context),
          child: SizedBox(
            width: 40,
            height: 40,
            child: Center(child: CountryFlag(code: code, size: 22)),
          ),
        ),
      ),
    );
  }
}

const _accented = 'àáâãäåçèéêëìíîïñòóôõöøùúûüýÿɛɔ';
const _plain = 'aaaaaaceeeeiiiinoooooouuuuyyeo';

/// Lowercase without accents, so "Égypte" sorts with E and matches "egy".
String _fold(String s) {
  final out = StringBuffer();
  for (final ch in s.toLowerCase().split('')) {
    final i = _accented.indexOf(ch);
    out.write(i < 0 ? ch : _plain[i]);
  }
  return out.toString();
}

void showDeliveryCountrySheet(BuildContext context) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    clipBehavior: Clip.antiAlias,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (_) => const _CountrySheet(),
  );
}

class _CountrySheet extends ConsumerStatefulWidget {
  const _CountrySheet();

  @override
  ConsumerState<_CountrySheet> createState() => _CountrySheetState();
}

class _CountrySheetState extends ConsumerState<_CountrySheet> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    final current = ref.watch(deliveryCountryProvider);
    final q = _fold(_query.trim());
    final options = [
      for (final c in deliveryCountries)
        (
          code: c,
          name: strings.countryName(c),
          key: _fold(strings.countryName(c))
        ),
    ]
        .where(
            (o) => q.isEmpty || o.key.contains(q) || o.code.toLowerCase() == q)
        .toList()
      ..sort((a, b) => a.key.compareTo(b.key));

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.75,
      minChildSize: 0.4,
      maxChildSize: 0.92,
      builder: (context, scrollController) => SafeArea(
        top: false,
        child: Padding(
          padding:
              EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                child: Text(
                  strings.get('header.chooseCountry'),
                  style: const TextStyle(
                      fontWeight: FontWeight.w800, fontSize: 18),
                ),
              ),
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: TextField(
                  onChanged: (v) => setState(() => _query = v),
                  textInputAction: TextInputAction.search,
                  decoration: InputDecoration(
                    hintText: strings.get('header.searchCountries'),
                    prefixIcon: const Icon(Icons.search_rounded),
                    isDense: true,
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Expanded(
                child: ListView.builder(
                  controller: scrollController,
                  padding: EdgeInsets.zero,
                  itemCount: options.length,
                  itemBuilder: (context, i) {
                    final o = options[i];
                    return SheetOptionTile(
                      leading: CountryFlag(code: o.code, size: 26),
                      title: o.name,
                      titleWeight: FontWeight.w600,
                      selected: o.code == current,
                      onTap: () {
                        ref
                            .read(deliveryCountryProvider.notifier)
                            .choose(o.code);
                        Navigator.pop(context);
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
