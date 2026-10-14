import '../currency/currencies.dart';
import 'languages.dart';

/// ISO 3166-1 alpha-2 codes offered in the "Deliver to" picker.
final deliveryCountries = (
  'AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ '
  'DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP '
  'KE KG KH KI KM KN KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP '
  'NR NZ OM PA PE PG PH PK PL PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT '
  'TV TW TZ UA UG US UY UZ VA VC VE VN VU WS YE ZA ZM ZW'
).split(' ');

/// Delivery country until one is detected or chosen.
const defaultDeliveryCountry = 'UG';

final _countryCodePattern = RegExp(r'^[A-Z]{2}$');

bool isCountryCode(String? code) => code != null && _countryCodePattern.hasMatch(code);

/// Countries whose own currency we can display; everyone else sees USD.
const _countryCurrency = <String, CurrencyCode>{
  'GB': CurrencyCode.gbp,
  'US': CurrencyCode.usd,
  'UG': CurrencyCode.ugx,
  'KE': CurrencyCode.kes,
  'CD': CurrencyCode.cdf,
  'RW': CurrencyCode.rwf,
};

/// Main supported language per country; everyone else gets English.
/// CD gets French (official language) rather than Lingala. KE stays English
/// (business default) while TZ gets Swahili (national language).
const _frenchCountries = [
  'FR', 'BE', 'LU', 'MC', 'SN', 'CI', 'CM', 'CG', 'CD', 'GA', 'BJ', 'BF', //
  'ML', 'NE', 'TD', 'TG', 'GN', 'MG', 'BI', 'DJ', 'HT', 'CF', 'KM',
];

final _countryLanguage = <String, LanguageCode>{
  for (final c in _frenchCountries) c: LanguageCode.fr,
  'RW': LanguageCode.rw,
  'TZ': LanguageCode.sw,
};

({CurrencyCode currency, LanguageCode language}) countryDefaults(String country) => (
      currency: _countryCurrency[country] ?? defaultCurrency,
      language: _countryLanguage[country] ?? defaultLanguage,
    );

/// Regional-indicator emoji for [code] (`UG` → 🇺🇬), or a globe when invalid.
String countryFlagEmoji(String code) {
  final upper = code.toUpperCase();
  if (!isCountryCode(upper)) return '🌐';
  return String.fromCharCodes(upper.codeUnits.map((c) => 0x1F1E6 + c - 65));
}
