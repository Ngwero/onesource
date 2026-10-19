import 'package:flutter_test/flutter_test.dart';
import 'package:onesource_mobile/currency/currencies.dart';
import 'package:onesource_mobile/currency/format_price.dart';

void main() {
  for (final currency in CurrencyCode.values) {
    test('$currency formats zero and product prices', () {
      for (final amount in [0, 1, 25000, 25000.5]) {
        final formatted = formatConvertedPrice(
          currency: currency,
          rates: {currency: 1},
          amountUgx: amount,
        );
        expect(formatted, contains(currencyInfo(currency).symbol));
        expect(formatted, matches(RegExp(r'\d')));
      }
    });
  }

  test('Rwandan francs retain grouping and round to whole francs', () {
    expect(
      formatConvertedPrice(
        currency: CurrencyCode.rwf,
        rates: {CurrencyCode.rwf: 1},
        amountUgx: 1234.6,
      ),
      'FRw1,235',
    );
  });
}
