import { describe, expect, it } from "vitest";
import { getLocales, registerLocale, resolveLocale, translate } from "@biocollect/i18n";
import { generatedLocales } from "@biocollect/i18n/src/generated-locales";
import { fr } from "@biocollect/i18n/src/locales/fr";

describe("fondation i18n partagée", () => {
  it("résout les clés françaises et anglaises avec interpolation", () => {
    expect(translate("fr", "mobile.greeting", { name: "Awa" })).toBe("Bonjour, Awa");
    expect(translate("en", "mobile.greeting", { name: "Awa" })).toBe("Hello, Awa");
  });

  it("replie une locale inconnue ou une clé manquante vers le français", () => {
    expect(resolveLocale("de")).toBe("fr");
    expect(translate("de", "common.back")).toBe("Retour");
    registerLocale({ code: "partial", label: "Partial", translation: { ...fr, common: { ...fr.common, back: undefined as unknown as string } } });
    expect(translate("partial", "common.back")).toBe("Retour");
  });

  it("reconnaît les langues exposées par les fichiers de traduction", () => {
    expect(generatedLocales.map(locale => locale.code)).toEqual(expect.arrayContaining(["fr", "en"]));
    expect(getLocales().map(locale => locale.code)).toEqual(expect.arrayContaining(["fr", "en"]));
  });
});
