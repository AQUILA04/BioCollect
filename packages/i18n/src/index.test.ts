import { describe, expect, it } from "vitest";
import { getLocales, registerLocale, resolveLocale, translate } from "./index";
import { generatedLocales } from "./generated-locales";
import { fr } from "./locales/fr";

describe("i18n BioCollect", () => {
  it("résout les traductions française et anglaise avec interpolation", () => {
    expect(translate("fr", "mobile.greeting", { name: "Awa" })).toBe("Bonjour, Awa");
    expect(translate("en", "mobile.greeting", { name: "Awa" })).toBe("Hello, Awa");
  });
  it("retombe sur le français en cas de locale ou de clé manquante", () => {
    expect(resolveLocale("de")).toBe("fr");
    registerLocale({ code: "partial", label: "Partial", translation: { ...fr, common: { ...fr.common, back: undefined as unknown as string } } });
    expect(translate("partial", "common.back")).toBe("Retour");
  });
  it("expose automatiquement les langues détectées dans les fichiers de locale", () => {
    expect(generatedLocales.map(locale => locale.code)).toEqual(expect.arrayContaining(["fr", "en"]));
    expect(getLocales().map(locale => locale.code)).toEqual(expect.arrayContaining(["fr", "en"]));
  });
});
