import i18n from "./index";
import { DEFAULT_LANGUAGE, STORAGE_KEY as LANGUAGE_STORAGE_KEY, type LanguageCode } from "./languages";
import {
  CURRENCY_STORAGE_KEY,
  DEFAULT_CURRENCY,
  type CurrencyCode,
} from "../currency/currencies";
import { storeCurrency } from "../currency/currencyStore";

/** Countries whose own currency we can display; everyone else sees USD. */
const COUNTRY_CURRENCY: Record<string, CurrencyCode> = {
  GB: "GBP",
  US: "USD",
  UG: "UGX",
  KE: "KES",
  CD: "CDF",
  RW: "RWF",
};

/**
 * Main supported language per country; everyone else gets English.
 * CD gets French (official language) rather than Lingala. KE stays English
 * (business default) while TZ gets Swahili (national language).
 */
const FRENCH_COUNTRIES =
  "FR BE LU MC SN CI CM CG CD GA BJ BF ML NE TD TG GN MG BI DJ HT CF KM".split(" ");

const COUNTRY_LANGUAGE: Record<string, LanguageCode> = {
  ...Object.fromEntries(FRENCH_COUNTRIES.map((c) => [c, "fr" as const])),
  RW: "rw",
  TZ: "sw",
};

export function countryDefaults(country: string): { currency: CurrencyCode; language: LanguageCode } {
  return {
    currency: COUNTRY_CURRENCY[country] ?? DEFAULT_CURRENCY,
    language: COUNTRY_LANGUAGE[country] ?? DEFAULT_LANGUAGE,
  };
}

/** "user" = picked in a switcher; "auto" = derived from the delivery country. */
type Source = "user" | "auto";
const CURRENCY_SOURCE_KEY = "onesource.currencySource";
const LANGUAGE_SOURCE_KEY = "onesource.languageSource";

function readSource(key: string): Source | null {
  try {
    const value = localStorage.getItem(key);
    return value === "user" || value === "auto" ? value : null;
  } catch {
    return null;
  }
}

function writeSource(key: string, source: Source) {
  try {
    localStorage.setItem(key, source);
  } catch {
    /* private mode */
  }
}

// Values saved before sources were tracked could only come from the switchers.
for (const [sourceKey, valueKey] of [
  [CURRENCY_SOURCE_KEY, CURRENCY_STORAGE_KEY],
  [LANGUAGE_SOURCE_KEY, LANGUAGE_STORAGE_KEY],
]) {
  try {
    if (!readSource(sourceKey) && localStorage.getItem(valueKey)) writeSource(sourceKey, "user");
  } catch {
    /* private mode */
  }
}

export function chooseCurrency(code: CurrencyCode) {
  writeSource(CURRENCY_SOURCE_KEY, "user");
  storeCurrency(code);
}

export function chooseLanguage(code: LanguageCode) {
  writeSource(LANGUAGE_SOURCE_KEY, "user");
  void i18n.changeLanguage(code);
}

/**
 * Switch currency and language to the country's defaults. With
 * `keepUserChoice` (auto-detected country) anything the visitor picked in a
 * switcher is left alone; a manual country change resets both.
 */
export function applyCountryDefaults(country: string, { keepUserChoice }: { keepUserChoice: boolean }) {
  const { currency, language } = countryDefaults(country);
  if (!keepUserChoice || readSource(CURRENCY_SOURCE_KEY) !== "user") {
    writeSource(CURRENCY_SOURCE_KEY, "auto");
    storeCurrency(currency);
  }
  if (!keepUserChoice || readSource(LANGUAGE_SOURCE_KEY) !== "user") {
    writeSource(LANGUAGE_SOURCE_KEY, "auto");
    if (i18n.language !== language) void i18n.changeLanguage(language);
  }
}
