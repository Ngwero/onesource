import 'dart:math' as math;

import 'package:intl/intl.dart';

import 'currencies.dart';

/// Format a UGX base amount in the selected currency.
String formatConvertedPrice({
  required CurrencyCode currency,
  required Map<CurrencyCode, double> rates,
  required num amountUgx,
}) {
  final info = currencyInfo(currency);
  if (amountUgx <= 0) {
    return _formatAmount(info, 0);
  }

  final rate = rates[currency] ?? 1;
  var converted = amountUgx * rate;

  if (converted > 0) {
    final minUnit = info.decimals == 0 ? 1.0 : math.pow(10, -info.decimals).toDouble();
    if (converted < minUnit) converted = minUnit;
  }

  return _formatAmount(info, converted);
}

String _formatAmount(CurrencyInfo info, double amount) {
  final locale = info.locale.replaceAll('_', '-');

  if (info.decimals == 0) {
    return NumberFormat.currency(
      locale: locale,
      symbol: info.symbol,
      decimalDigits: 0,
    ).format(amount.round());
  }

  // Show up to 2 decimals but drop trailing zeros (£1.00 → £1, keep £0.34).
  final hasFraction = (amount - amount.truncateToDouble()).abs() > 0.000001;
  final fractionDigits = hasFraction ? info.decimals : 0;

  try {
    return NumberFormat.currency(
      locale: locale,
      symbol: info.symbol,
      decimalDigits: fractionDigits,
    ).format(amount);
  } catch (_) {
    final text = amount.toStringAsFixed(fractionDigits);
    final trimmed = fractionDigits > 0 ? text.replaceFirst(RegExp(r'\.?0+$'), '') : text;
    return '${info.symbol}$trimmed';
  }
}

double convertAmount({
  required CurrencyCode currency,
  required Map<CurrencyCode, double> rates,
  required num amountUgx,
}) {
  return amountUgx * (rates[currency] ?? 1);
}
