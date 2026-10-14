import 'package:flutter_test/flutter_test.dart';
import 'package:onesource_mobile/currency/currencies.dart';
import 'package:onesource_mobile/i18n/country_defaults.dart';
import 'package:onesource_mobile/i18n/languages.dart';

void main() {
  test('maps countries to the website currency and language defaults', () {
    expect(countryDefaults('UG'), (currency: CurrencyCode.ugx, language: LanguageCode.en));
    expect(countryDefaults('CD'), (currency: CurrencyCode.cdf, language: LanguageCode.fr));
    expect(countryDefaults('RW'), (currency: CurrencyCode.rwf, language: LanguageCode.rw));
    expect(countryDefaults('TZ'), (currency: CurrencyCode.usd, language: LanguageCode.sw));
    expect(countryDefaults('KE'), (currency: CurrencyCode.kes, language: LanguageCode.en));
    expect(countryDefaults('FR'), (currency: CurrencyCode.usd, language: LanguageCode.fr));
    expect(countryDefaults('JP'), (currency: CurrencyCode.usd, language: LanguageCode.en));
  });

  test('builds flag emoji and validates codes', () {
    expect(countryFlagEmoji('ug'), '🇺🇬');
    expect(countryFlagEmoji('X1'), '🌐');
    expect(deliveryCountries, containsAll(['UG', 'GB', 'US', 'CD']));
  });
}
