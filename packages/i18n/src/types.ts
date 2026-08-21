import type { fr } from "./locales/fr";

type DeepTranslation<T> = T extends "ltr" | "rtl" ? "ltr" | "rtl" : T extends string ? string : T extends object ? { [Key in keyof T]: DeepTranslation<T[Key]> } : T;
export type Translation = DeepTranslation<typeof fr>;
export type Translations = Translation;
export type TranslationKey<T = Translation> = { [Key in keyof T & string]: T[Key] extends string ? Key : T[Key] extends object ? `${Key}.${TranslationKey<T[Key]>}` : never }[keyof T & string];
export type LocaleCode = string;
export type LocaleDefinition = { code: LocaleCode; label: string; direction?: "ltr" | "rtl"; translation: Translation };
export type TranslateValues = Record<string, string | number>;
export type Translator = (key: TranslationKey, values?: TranslateValues) => string;
