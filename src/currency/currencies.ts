export type CurrencyCode = "GBP" | "USD" | "UGX" | "KES" | "CDF" | "RWF";

/** Product prices in the database are stored in this currency. */
export const BASE_CURRENCY: CurrencyCode = "UGX";
export const FREE_DELIVERY_THRESHOLD_GBP = 100_000;

export type CurrencyInfo = {
  code: CurrencyCode;
  symbol: string;
  nameKey: string;
  locale: string;
  flag: string;
  /** Intl fraction digits for display */
  decimals: number;
};

export const CURRENCIES: CurrencyInfo[] = [
  { code: "UGX", symbol: "USh", nameKey: "UGX", locale: "en-UG", flag: "🇺🇬", decimals: 0 },
  { code: "GBP", symbol: "£", nameKey: "GBP", locale: "en-GB", flag: "🇬🇧", decimals: 2 },
  { code: "USD", symbol: "$", nameKey: "USD", locale: "en-US", flag: "🇺🇸", decimals: 2 },
  { code: "KES", symbol: "KSh", nameKey: "KES", locale: "en-KE", flag: "🇰🇪", decimals: 2 },
  { code: "CDF", symbol: "FC", nameKey: "CDF", locale: "fr-CD", flag: "🇨🇩", decimals: 0 },
  { code: "RWF", symbol: "FRw", nameKey: "RWF", locale: "rw-RW", flag: "🇷🇼", decimals: 0 },
];

export const CURRENCY_STORAGE_KEY = "amazon-uk-clone-currency";
export const RATES_CACHE_KEY = "amazon-uk-clone-rates-cache";

export function getCurrencyInfo(code: CurrencyCode): CurrencyInfo {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

/** Fallback rates (UGX base) if live API unavailable */
export const FALLBACK_RATES: Record<CurrencyCode, number> = {
  UGX: 1,
  GBP: 0.00021,
  USD: 0.00027,
  KES: 0.035,
  CDF: 0.65,
  RWF: 0.41,
};
