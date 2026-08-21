import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { createTranslator, defaultLocale, getLocales, resolveLocale, type LocaleCode, type TranslateValues, type TranslationKey } from "@biocollect/i18n";

const STORAGE_KEY = "biocollect/mobile/locale/v1";
type I18nValue = { ready: boolean; locale: LocaleCode; locales: ReturnType<typeof getLocales>; setLocale: (locale: LocaleCode) => Promise<void>; t: (key: TranslationKey, values?: TranslateValues) => string };
const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(defaultLocale);
  const [ready, setReady] = useState(false);
  useEffect(() => { void AsyncStorage.getItem(STORAGE_KEY).then(value => { setLocaleState(resolveLocale(value ?? Intl.DateTimeFormat().resolvedOptions().locale.split("-")[0])); setReady(true); }); }, []);
  async function setLocale(next: LocaleCode) { const value = resolveLocale(next); setLocaleState(value); await AsyncStorage.setItem(STORAGE_KEY, value); }
  const value = useMemo(() => ({ ready, locale, locales: getLocales(), setLocale, t: createTranslator(locale) }), [ready, locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() { const context = useContext(I18nContext); if (!context) throw new Error("useI18n doit être utilisé sous I18nProvider."); return context; }
