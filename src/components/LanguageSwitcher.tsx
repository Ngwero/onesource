import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "../i18n/languages";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="header-switcher-btn flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-xl border border-border bg-surface hover:bg-muted transition-colors text-sm font-medium min-h-[44px] min-w-[44px] sm:min-w-0 justify-center"
        aria-label={t("lang.select")}
        aria-expanded={open}
      >
        <span>{current.flag}</span>
        <span className="hidden sm:inline">{current.nativeName}</span>
        <svg
          className={`w-4 h-4 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="header-switcher-menu absolute right-0 top-full mt-2 w-56 max-w-[min(16rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface shadow-xl py-2 z-[60]">
          <p className="px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide">
            {t("lang.select")}
          </p>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                i18n.changeLanguage(lang.code);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                i18n.language === lang.code
                  ? "bg-accent-light text-accent font-semibold"
                  : "hover:bg-muted text-text"
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <div>
                <p className="font-medium">{lang.nativeName}</p>
                <p className="text-xs text-text-muted">{t(`lang.${lang.code}`)}</p>
              </div>
              {i18n.language === lang.code && (
                <svg className="w-4 h-4 ml-auto text-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
