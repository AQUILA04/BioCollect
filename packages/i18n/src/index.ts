import { en } from "./locales/en";
import { fr } from "./locales/fr";
import { generatedLocales } from "./generated-locales";
import type { LocaleCode, LocaleDefinition, TranslateValues, Translation, TranslationKey, Translator } from "./types";

export type { LocaleCode, LocaleDefinition, TranslateValues, Translation, TranslationKey, Translations, Translator } from "./types";

const definitions = new Map<LocaleCode, LocaleDefinition>();
export const defaultLocale = "fr";

export function registerLocale(definition: LocaleDefinition) { definitions.set(definition.code, definition); }
export function getLocales() { return Array.from(definitions.values()).map(({ code, label, direction = "ltr" }) => ({ code, label, direction })); }
export function isLocale(code: string | null | undefined): code is LocaleCode { return Boolean(code && definitions.has(code)); }
export function resolveLocale(code: string | null | undefined): LocaleCode { return isLocale(code) ? code : defaultLocale; }

function lookup(dictionary: Translation, path: string): string | undefined {
  return path.split(".").reduce<unknown>((value, key) => value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined, dictionary) as string | undefined;
}
function interpolate(template: string, values: TranslateValues) { return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`)); }

export function translate(locale: string | null | undefined, key: TranslationKey, values: TranslateValues = {}) {
  const active = definitions.get(resolveLocale(locale))?.translation ?? fr;
  const fallback = definitions.get(defaultLocale)?.translation ?? fr;
  const template = lookup(active, key) ?? lookup(fallback, key) ?? key;
  return interpolate(template, values);
}

export function createTranslator(locale: string | null | undefined): Translator {
  return (key, values) => translate(locale, key, values);
}

generatedLocales.forEach(registerLocale);
