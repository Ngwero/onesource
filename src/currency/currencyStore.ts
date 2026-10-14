import { DEFAULT_CURRENCY, type CurrencyCode } from "./currencies";
import { getSavedCurrency, saveCurrency } from "./fetchRates";

const listeners = new Set<() => void>();
let current: CurrencyCode = getSavedCurrency() ?? DEFAULT_CURRENCY;

export function getCurrency(): CurrencyCode {
  return current;
}

export function subscribeCurrency(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Persist and broadcast the display currency (works outside React). */
export function storeCurrency(code: CurrencyCode) {
  saveCurrency(code);
  if (code === current) return;
  current = code;
  listeners.forEach((l) => l());
}
