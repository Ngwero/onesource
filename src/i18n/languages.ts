export const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧", nativeName: "English" },
  { code: "fr", label: "French", flag: "🇫🇷", nativeName: "Français" },
  { code: "sw", label: "Swahili", flag: "🇹🇿", nativeName: "Kiswahili" },
  { code: "ln", label: "Congolese", flag: "🇨🇩", nativeName: "Lingála" },
  { code: "rw", label: "Rwandan", flag: "🇷🇼", nativeName: "Ikinyarwanda" },
] as const;

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: LanguageCode = "en";
export const STORAGE_KEY = "amazon-uk-clone-lang";
