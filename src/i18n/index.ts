import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import sw from "./locales/sw.json";
import ln from "./locales/ln.json";
import rw from "./locales/rw.json";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_CODES,
  STORAGE_KEY,
  type LanguageCode,
} from "./languages";

const saved = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
const initialLang =
  saved && LANGUAGE_CODES.includes(saved) ? saved : DEFAULT_LANGUAGE;

function htmlLang(code: string): string {
  if (code === "ln") return "ln";
  if (code === "rw") return "rw";
  if (code === "sw") return "sw";
  return code;
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    sw: { translation: sw },
    ln: { translation: ln },
    rw: { translation: rw },
  },
  lng: initialLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnEmptyString: false,
  returnNull: false,
});

i18n.on("languageChanged", (lng) => {
  localStorage.setItem(STORAGE_KEY, lng);
  document.documentElement.lang = htmlLang(lng);
});

document.documentElement.lang = htmlLang(initialLang);

export default i18n;
