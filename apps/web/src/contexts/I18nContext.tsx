import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { createTranslator, defaultLocale, getLocales, resolveLocale, type LocaleCode, type TranslateValues, type TranslationKey } from "@biocollect/i18n";

const STORAGE_KEY = "biocollect.locale";
type I18nValue = { locale: LocaleCode; locales: ReturnType<typeof getLocales>; setLocale: (locale: LocaleCode) => void; t: (key: TranslationKey, values?: TranslateValues) => string };
const I18nContext = createContext<I18nValue | null>(null);

function detectLocale() {
  if (typeof window === "undefined") return defaultLocale;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return resolveLocale(stored ?? navigator.language.split("-")[0]);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(detectLocale);
  const setLocale = (next: LocaleCode) => setLocaleState(resolveLocale(next));
  useEffect(() => { window.localStorage.setItem(STORAGE_KEY, locale); document.documentElement.lang = locale; }, [locale]);
  const value = useMemo(() => ({ locale, locales: getLocales(), setLocale, t: createTranslator(locale) }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n doit être utilisé sous I18nProvider.");
  return context;
}
