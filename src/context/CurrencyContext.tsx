import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import i18n from "../i18n";
import {
  BASE_CURRENCY,
  FREE_DELIVERY_THRESHOLD_GBP,
  getCurrencyInfo,
  type CurrencyCode,
} from "../currency/currencies";
import { fetchLiveRates, getSavedCurrency, saveCurrency } from "../currency/fetchRates";

type CurrencyContextType = {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  rates: Record<CurrencyCode, number>;
  ratesUpdatedAt: string | null;
  loading: boolean;
  error: string | null;
  /** Convert & format a UGX base price */
  formatPrice: (amountUgx: number) => string;
  /** Convert UGX amount to selected currency (number) */
  convert: (amountUgx: number) => number;
  freeDeliveryThreshold: number;
  refreshRates: () => Promise<void>;
};

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(getSavedCurrency);
  const [rates, setRates] = useState<Record<CurrencyCode, number>>({
    GBP: 1,
    USD: 1,
    UGX: 1,
    KES: 1,
    CDF: 1,
    RWF: 1,
  });
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { rates: liveRates, updatedAt } = await fetchLiveRates();
      setRates(liveRates);
      setRatesUpdatedAt(updatedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t("errors.loadRates"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRates();
    const interval = setInterval(loadRates, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadRates]);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    saveCurrency(code);
  }, []);

  const convert = useCallback(
    (amountGbp: number) => {
      const rate = rates[currency] ?? 1;
      return amountGbp * rate;
    },
    [currency, rates]
  );

  const formatPrice = useCallback(
    (amountGbp: number) => {
      const info = getCurrencyInfo(currency);
      const converted = convert(amountGbp);
      try {
        return new Intl.NumberFormat(info.locale, {
          style: "currency",
          currency: info.code,
          minimumFractionDigits: info.decimals,
          maximumFractionDigits: info.decimals,
        }).format(converted);
      } catch {
        return `${info.symbol}${converted.toFixed(info.decimals)}`;
      }
    },
    [currency, convert]
  );

  const freeDeliveryThreshold = convert(FREE_DELIVERY_THRESHOLD_GBP);

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        rates,
        ratesUpdatedAt,
        loading,
        error,
        formatPrice,
        convert,
        freeDeliveryThreshold,
        refreshRates: loadRates,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}

/** @deprecated Use useCurrency().formatPrice — prices are stored in GBP */
export function formatPriceGbp(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: BASE_CURRENCY,
  }).format(amount);
}
