enum CurrencyCode { ugx, gbp, usd, kes, cdf, rwf }

const baseCurrency = CurrencyCode.ugx;
const freeDeliveryThresholdUgx = 100000;
const currencyStorageKey = 'amazon-uk-clone-currency';
const ratesCacheKey = 'amazon-uk-clone-rates-cache';

class CurrencyInfo {
  const CurrencyInfo({
    required this.code,
    required this.symbol,
    required this.nameKey,
    required this.locale,
    required this.flag,
    required this.decimals,
  });

  final CurrencyCode code;
  final String symbol;
  final String nameKey;
  final String locale;
  final String flag;
  final int decimals;
}

const currencies = <CurrencyInfo>[
  CurrencyInfo(code: CurrencyCode.ugx, symbol: 'USh', nameKey: 'UGX', locale: 'en_UG', flag: '🇺🇬', decimals: 0),
  CurrencyInfo(code: CurrencyCode.gbp, symbol: '£', nameKey: 'GBP', locale: 'en_GB', flag: '🇬🇧', decimals: 2),
  CurrencyInfo(code: CurrencyCode.usd, symbol: r'$', nameKey: 'USD', locale: 'en_US', flag: '🇺🇸', decimals: 2),
  CurrencyInfo(code: CurrencyCode.kes, symbol: 'KSh', nameKey: 'KES', locale: 'en_KE', flag: '🇰🇪', decimals: 2),
  CurrencyInfo(code: CurrencyCode.cdf, symbol: 'FC', nameKey: 'CDF', locale: 'fr_CD', flag: '🇨🇩', decimals: 0),
  CurrencyInfo(code: CurrencyCode.rwf, symbol: 'FRw', nameKey: 'RWF', locale: 'rw_RW', flag: '🇷🇼', decimals: 0),
];

CurrencyInfo currencyInfo(CurrencyCode code) {
  return currencies.firstWhere((c) => c.code == code, orElse: () => currencies.first);
}

CurrencyCode currencyCodeFromString(String? raw) {
  switch ((raw ?? '').toUpperCase()) {
    case 'GBP':
      return CurrencyCode.gbp;
    case 'USD':
      return CurrencyCode.usd;
    case 'KES':
      return CurrencyCode.kes;
    case 'CDF':
      return CurrencyCode.cdf;
    case 'RWF':
      return CurrencyCode.rwf;
    default:
      return CurrencyCode.ugx;
  }
}

String currencyCodeLabel(CurrencyCode code) => code.name.toUpperCase();

const fallbackRates = <CurrencyCode, double>{
  CurrencyCode.ugx: 1,
  CurrencyCode.gbp: 0.00021,
  CurrencyCode.usd: 0.00027,
  CurrencyCode.kes: 0.035,
  CurrencyCode.cdf: 0.65,
  CurrencyCode.rwf: 0.41,
};
