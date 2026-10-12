import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";

const API_BASE = import.meta.env.VITE_API_URL || "/api";
const CHOSEN_KEY = "onesource.deliveryCountry";
const DETECTED_KEY = "onesource.detectedCountry";
const DEFAULT_COUNTRY = "UG";

/** ISO 3166-1 alpha-2 codes offered in the "Deliver to" picker. */
export const DELIVERY_COUNTRIES = (
  "AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ " +
  "DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP " +
  "KE KG KH KI KM KN KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP " +
  "NR NZ OM PA PE PG PH PK PL PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT " +
  "TV TW TZ UA UG US UY UZ VA VC VE VN VU WS YE ZA ZM ZW"
).split(" ");

const listeners = new Set<() => void>();
let country = readStored(CHOSEN_KEY) ?? readStored(DETECTED_KEY) ?? DEFAULT_COUNTRY;
let detection: Promise<void> | null = null;

function readStored(key: string): string | null {
  try {
    const value = localStorage.getItem(key);
    return value && /^[A-Z]{2}$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

function setCountry(code: string) {
  if (code === country) return;
  country = code;
  listeners.forEach((l) => l());
}

function browserRegion(): string | null {
  for (const tag of navigator.languages ?? [navigator.language]) {
    try {
      const region = new Intl.Locale(tag).maximize().region;
      if (region && /^[A-Z]{2}$/.test(region)) return region;
    } catch {
      /* invalid tag */
    }
  }
  return null;
}

function detectCountry() {
  if (detection || readStored(CHOSEN_KEY)) return;
  detection = fetch(`${API_BASE}/geo`)
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null)
    .then((data: { country?: string | null } | null) => {
      const detected = data?.country || browserRegion();
      if (!detected || readStored(CHOSEN_KEY)) return;
      store(DETECTED_KEY, detected);
      setCountry(detected);
    });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Visitor's delivery country: their own choice, else detected from their IP, else Uganda. */
export function useDeliveryCountry() {
  const { i18n } = useTranslation();
  const code = useSyncExternalStore(subscribe, () => country, () => DEFAULT_COUNTRY);

  useEffect(detectCountry, []);

  const regionNames = useMemo(() => {
    for (const locale of [i18n.language, "en"]) {
      try {
        return new Intl.DisplayNames([locale], { type: "region", fallback: "code" });
      } catch {
        /* unsupported locale */
      }
    }
    return null;
  }, [i18n.language]);

  const countryName = useCallback((c: string) => regionNames?.of(c) ?? c, [regionNames]);

  const chooseCountry = useCallback((c: string) => {
    store(CHOSEN_KEY, c);
    setCountry(c);
  }, []);

  return { code, name: countryName(code), countryName, chooseCountry };
}
