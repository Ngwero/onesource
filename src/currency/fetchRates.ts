import {
  BASE_CURRENCY,
  CURRENCY_STORAGE_KEY,
  FALLBACK_RATES,
  RATES_CACHE_KEY,
  type CurrencyCode,
} from "./currencies";

const API_URL = `https://open.er-api.com/v6/latest/${BASE_CURRENCY}`;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

type RatesCache = {
  rates: Record<CurrencyCode, number>;
  updatedAt: string;
  fetchedAt: number;
};

type ApiResponse = {
  result: string;
  base_code: string;
  rates: Record<string, number>;
  time_last_update_utc?: string;
};

const TARGET_CODES: CurrencyCode[] = ["GBP", "USD", "UGX", "KES", "CDF", "RWF"];

function parseRates(data: ApiResponse): Record<CurrencyCode, number> {
  const rates = { ...FALLBACK_RATES };
  for (const code of TARGET_CODES) {
    if (data.rates[code] != null) {
      rates[code] = data.rates[code];
    }
  }
  return rates;
}

function readCache(): RatesCache | null {
  try {
    const raw = localStorage.getItem(RATES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RatesCache;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(rates: Record<CurrencyCode, number>, updatedAt: string) {
  const cache: RatesCache = {
    rates,
    updatedAt,
    fetchedAt: Date.now(),
  };
  localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(cache));
}

export async function fetchLiveRates(): Promise<{
  rates: Record<CurrencyCode, number>;
  updatedAt: string;
  fromCache: boolean;
}> {
  const cached = readCache();
  if (cached) {
    return { rates: cached.rates, updatedAt: cached.updatedAt, fromCache: true };
  }

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as ApiResponse;
    if (data.result !== "success") throw new Error("API error");

    const rates = parseRates(data);
    const updatedAt = data.time_last_update_utc ?? new Date().toUTCString();
    writeCache(rates, updatedAt);
    return { rates, updatedAt, fromCache: false };
  } catch {
    const stale = localStorage.getItem(RATES_CACHE_KEY);
    if (stale) {
      const parsed = JSON.parse(stale) as RatesCache;
      return { rates: parsed.rates, updatedAt: parsed.updatedAt, fromCache: true };
    }
    return {
      rates: FALLBACK_RATES,
      updatedAt: new Date().toUTCString(),
      fromCache: false,
    };
  }
}

export function getSavedCurrency(): CurrencyCode {
  const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
  if (saved && TARGET_CODES.includes(saved as CurrencyCode)) {
    return saved as CurrencyCode;
  }
  return BASE_CURRENCY;
}

export function saveCurrency(code: CurrencyCode) {
  localStorage.setItem(CURRENCY_STORAGE_KEY, code);
}
